const router = require('express').Router();
const { query } = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM categories WHERE user_id = $1 ORDER BY type, name',
      [req.user.id]
    );
    res.json(rows);
  } catch { res.status(500).json({ error: 'Помилка сервера' }); }
});

router.post('/', async (req, res) => {
  const { name, type, icon, color } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'Назва і тип обов\'язкові' });
  try {
    const { rows } = await query(
      'INSERT INTO categories (user_id, name, type, icon, color) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.user.id, name.trim(), type, icon || 'Tag', color || '#10b981']
    );
    res.status(201).json(rows[0]);
  } catch { res.status(500).json({ error: 'Помилка сервера' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM categories WHERE id=$1 AND user_id=$2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Категорію не знайдено' });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Помилка сервера' }); }
});

module.exports = router;
