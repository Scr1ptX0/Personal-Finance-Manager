const router = require('express').Router();
const { query, db } = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', async (req, res) => {
  const { type, from, to, account_id, category_id } = req.query;
  let sql = `
    SELECT t.id, t.type, t.amount, t.currency, t.description, t.date,
           t.account_id, t.to_account_id, t.category_id,
           c.name AS category_name, c.color AS category_color,
           a.name AS account_name, ta.name AS to_account_name
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN accounts a ON t.account_id = a.id
    LEFT JOIN accounts ta ON t.to_account_id = ta.id
    WHERE t.user_id = $1
  `;
  const params = [req.user.id];
  let i = 2;
  if (type)        { sql += ` AND t.type = $${i++}`;        params.push(type); }
  if (from)        { sql += ` AND t.date >= $${i++}`;       params.push(from); }
  if (to)          { sql += ` AND t.date <= $${i++}`;       params.push(to); }
  if (account_id)  { sql += ` AND t.account_id = $${i++}`;  params.push(account_id); }
  if (category_id) { sql += ` AND t.category_id = $${i++}`; params.push(category_id); }
  sql += ' ORDER BY t.date DESC, t.created_at DESC';
  try {
    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Transactions fetch error:', err.message);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.post('/', async (req, res) => {
  const { type, amount, currency, category_id, account_id, to_account_id, description, date } = req.body;
  if (!type || !amount || !account_id || !date) {
    return res.status(400).json({ error: 'Тип, сума, рахунок і дата обов\'язкові' });
  }
  try {
    const accCheck = db.prepare('SELECT id FROM accounts WHERE id=? AND user_id=?').get(account_id, req.user.id);
    if (!accCheck) return res.status(403).json({ error: 'Рахунок не знайдено' });

    const run = db.transaction(() => {
      const r = db.prepare(
        `INSERT INTO transactions (user_id, type, amount, currency, category_id, account_id, to_account_id, description, date)
         VALUES (?,?,?,?,?,?,?,?,?)`
      ).run(req.user.id, type, amount, currency || 'UAH', category_id || null, account_id, to_account_id || null, description || '', date);

      if (type === 'income') {
        db.prepare('UPDATE accounts SET balance = balance + ? WHERE id=?').run(amount, account_id);
      } else if (type === 'expense') {
        db.prepare('UPDATE accounts SET balance = balance - ? WHERE id=?').run(amount, account_id);
      } else if (type === 'transfer') {
        db.prepare('UPDATE accounts SET balance = balance - ? WHERE id=?').run(amount, account_id);
        if (to_account_id) db.prepare('UPDATE accounts SET balance = balance + ? WHERE id=?').run(amount, to_account_id);
      }

      return db.prepare(
        `SELECT id, type, amount, currency, category_id, account_id, to_account_id, description, date
         FROM transactions WHERE rowid=?`
      ).get(r.lastInsertRowid);
    });

    res.status(201).json(run());
  } catch (err) {
    console.error('Transaction create error:', err.message);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.put('/:id', async (req, res) => {
  const { type, amount, currency, category_id, account_id, to_account_id, description, date } = req.body;
  if (!type || !amount || !account_id || !date) {
    return res.status(400).json({ error: 'Тип, сума, рахунок і дата обов\'язкові' });
  }
  try {
    const run = db.transaction(() => {
      const old = db.prepare('SELECT * FROM transactions WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
      if (!old) return null;

      // Reverse old effects
      if (old.type === 'income') {
        db.prepare('UPDATE accounts SET balance = balance - ? WHERE id=?').run(old.amount, old.account_id);
      } else if (old.type === 'expense') {
        db.prepare('UPDATE accounts SET balance = balance + ? WHERE id=?').run(old.amount, old.account_id);
      } else if (old.type === 'transfer') {
        db.prepare('UPDATE accounts SET balance = balance + ? WHERE id=?').run(old.amount, old.account_id);
        if (old.to_account_id) db.prepare('UPDATE accounts SET balance = balance - ? WHERE id=?').run(old.amount, old.to_account_id);
      }

      // Apply new effects
      if (type === 'income') {
        db.prepare('UPDATE accounts SET balance = balance + ? WHERE id=?').run(amount, account_id);
      } else if (type === 'expense') {
        db.prepare('UPDATE accounts SET balance = balance - ? WHERE id=?').run(amount, account_id);
      } else if (type === 'transfer') {
        db.prepare('UPDATE accounts SET balance = balance - ? WHERE id=?').run(amount, account_id);
        if (to_account_id) db.prepare('UPDATE accounts SET balance = balance + ? WHERE id=?').run(amount, to_account_id);
      }

      db.prepare(
        `UPDATE transactions SET type=?, amount=?, currency=?, category_id=?, account_id=?,
         to_account_id=?, description=?, date=? WHERE id=?`
      ).run(type, amount, currency || 'UAH', category_id || null, account_id,
            to_account_id || null, description || '', date, req.params.id);

      return db.prepare(
        `SELECT id, type, amount, currency, category_id, account_id, to_account_id, description, date
         FROM transactions WHERE id=?`
      ).get(req.params.id);
    });

    const updated = run();
    if (!updated) return res.status(404).json({ error: 'Транзакцію не знайдено' });
    res.json(updated);
  } catch (err) {
    console.error('Transaction update error:', err.message);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const run = db.transaction(() => {
      const tx = db.prepare('SELECT * FROM transactions WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
      if (!tx) return false;

      if (tx.type === 'income') {
        db.prepare('UPDATE accounts SET balance = balance - ? WHERE id=?').run(tx.amount, tx.account_id);
      } else if (tx.type === 'expense') {
        db.prepare('UPDATE accounts SET balance = balance + ? WHERE id=?').run(tx.amount, tx.account_id);
      } else if (tx.type === 'transfer') {
        db.prepare('UPDATE accounts SET balance = balance + ? WHERE id=?').run(tx.amount, tx.account_id);
        if (tx.to_account_id) db.prepare('UPDATE accounts SET balance = balance - ? WHERE id=?').run(tx.amount, tx.to_account_id);
      }

      db.prepare('DELETE FROM transactions WHERE id=?').run(req.params.id);
      return true;
    });

    if (!run()) return res.status(404).json({ error: 'Транзакцію не знайдено' });
    res.json({ success: true });
  } catch (err) {
    console.error('Transaction delete error:', err.message);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

module.exports = router;
