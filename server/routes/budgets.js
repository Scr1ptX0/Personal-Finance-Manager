const router = require('express').Router();
const { query } = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT b.*, c.name AS category_name, c.color AS category_color
       FROM budgets b
       LEFT JOIN categories c ON b.category_id = c.id
       WHERE b.user_id = $1
       ORDER BY b.id`,
      [req.user.id]
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Помилка сервера' }); }
});

router.post('/', async (req, res) => {
  const { category_id, amount, currency, period } = req.body;
  if (!category_id || !amount) return res.status(400).json({ error: 'Категорія і сума обов\'язкові' });
  try {
    const { rows } = await query(
      'INSERT INTO budgets (user_id, category_id, amount, currency, period) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.user.id, category_id, amount, currency || 'UAH', period || 'monthly']
    );
    res.status(201).json(rows[0]);
  } catch { res.status(500).json({ error: 'Помилка сервера' }); }
});

router.put('/:id', async (req, res) => {
  const { amount, period } = req.body;
  if (!amount || isNaN(amount) || amount <= 0)
    return res.status(400).json({ error: 'Введіть коректну суму' });
  try {
    const { rows } = await query(
      'UPDATE budgets SET amount=$1, period=COALESCE($2, period) WHERE id=$3 AND user_id=$4 RETURNING *',
      [amount, period || null, req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Бюджет не знайдено' });
    res.json(rows[0]);
  } catch { res.status(500).json({ error: 'Помилка сервера' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM budgets WHERE id=$1 AND user_id=$2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Бюджет не знайдено' });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Помилка сервера' }); }
});

module.exports = router;
