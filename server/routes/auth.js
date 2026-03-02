const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db');
const auth = require('../middleware/auth');

const DEFAULT_CATEGORIES = [
  ['Зарплата', 'income', 'Briefcase', '#10b981'],
  ['Фріланс', 'income', 'Laptop', '#06b6d4'],
  ['Інвестиції', 'income', 'TrendingUp', '#8b5cf6'],
  ['Продукти', 'expense', 'ShoppingCart', '#f59e0b'],
  ['Транспорт', 'expense', 'Car', '#3b82f6'],
  ['Розваги', 'expense', 'Gamepad2', '#ec4899'],
  ['Комунальні', 'expense', 'Home', '#f97316'],
  ['Здоров\'я', 'expense', 'Heart', '#ef4444'],
  ['Одяг', 'expense', 'Shirt', '#a855f7'],
  ['Кафе', 'expense', 'Coffee', '#78716c'],
];

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Всі поля обов\'язкові' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Пароль мінімум 6 символів' });
  }
  try {
    const exists = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (exists.rows.length) {
      return res.status(409).json({ error: 'Email вже зареєстровано' });
    }
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name.trim(), email.toLowerCase(), hash]
    );
    const user = rows[0];
    for (const [catName, type, icon, color] of DEFAULT_CATEGORIES) {
      await query(
        'INSERT INTO categories (user_id, name, type, icon, color, is_default) VALUES ($1,$2,$3,$4,$5,true)',
        [user.id, catName, type, icon, color]
      );
    }
    res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Введіть email та пароль' });
  }
  try {
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!rows.length) {
      return res.status(401).json({ error: 'Невірний email або пароль' });
    }
    const valid = await bcrypt.compare(password, rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Невірний email або пароль' });
    }
    const user = { id: rows[0].id, name: rows[0].name, email: rows[0].email };
    res.json({ token: signToken(user), user });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, name, email, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Користувача не знайдено' });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.put('/profile', auth, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Ім\'я обов\'язкове' });
  try {
    const { rows } = await query(
      'UPDATE users SET name=$1 WHERE id=$2 RETURNING id, name, email',
      [name.trim(), req.user.id]
    );
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

module.exports = router;
