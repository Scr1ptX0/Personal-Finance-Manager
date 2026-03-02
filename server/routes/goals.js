const router = require('express').Router();
const { query } = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM goals WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Помилка сервера' }); }
});

router.post('/', async (req, res) => {
  const { name, target_amount, current_amount, currency, deadline, color } = req.body;
  if (!name || !target_amount) return res.status(400).json({ error: 'Назва і цільова сума обов\'язкові' });
  try {
    const { rows } = await query(
      `INSERT INTO goals (user_id, name, target_amount, current_amount, currency, deadline, color)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.id, name.trim(), target_amount, current_amount || 0, currency || 'UAH', deadline || null, color || '#3b82f6']
    );
    res.status(201).json(rows[0]);
  } catch { res.status(500).json({ error: 'Помилка сервера' }); }
});

router.put('/:id', async (req, res) => {
  const { name, target_amount, current_amount, currency, deadline, color } = req.body;
  try {
    const { rows } = await query(
      `UPDATE goals SET name=$1, target_amount=$2, current_amount=$3, currency=$4, deadline=$5, color=$6
       WHERE id=$7 AND user_id=$8 RETURNING *`,
      [name, target_amount, current_amount, currency, deadline || null, color, req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Ціль не знайдено' });
    res.json(rows[0]);
  } catch { res.status(500).json({ error: 'Помилка сервера' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM goals WHERE id=$1 AND user_id=$2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Ціль не знайдено' });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Помилка сервера' }); }
});

module.exports = router;
