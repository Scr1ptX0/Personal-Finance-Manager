const router = require('express').Router();
const { query } = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM accounts WHERE user_id = $1 ORDER BY created_at ASC',
      [req.user.id]
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Помилка сервера' }); }
});

router.post('/', async (req, res) => {
  const { name, type, currency, balance, color, icon } = req.body;
  if (!name || !type || !currency) {
    return res.status(400).json({ error: 'Назва, тип і валюта обов\'язкові' });
  }
  try {
    const { rows } = await query(
      'INSERT INTO accounts (user_id, name, type, currency, balance, color, icon) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [req.user.id, name.trim(), type, currency, balance || 0, color || '#10b981', icon || 'CreditCard']
    );
    res.status(201).json(rows[0]);
  } catch { res.status(500).json({ error: 'Помилка сервера' }); }
});

router.put('/:id', async (req, res) => {
  const { name, type, currency, balance, color, icon } = req.body;
  try {
    const { rows } = await query(
      'UPDATE accounts SET name=$1, type=$2, currency=$3, balance=$4, color=$5, icon=$6 WHERE id=$7 AND user_id=$8 RETURNING *',
      [name, type, currency, balance, color, icon, req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Рахунок не знайдено' });
    res.json(rows[0]);
  } catch { res.status(500).json({ error: 'Помилка сервера' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM accounts WHERE id=$1 AND user_id=$2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Рахунок не знайдено' });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Помилка сервера' }); }
});

module.exports = router;
