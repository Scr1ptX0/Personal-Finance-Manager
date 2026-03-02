const router = require('express').Router();
const { query } = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', async (req, res) => {
  const { format = 'json', from, to } = req.query;

  let sql = `
    SELECT t.date, t.type, t.amount, t.currency, t.description,
           c.name AS category, a.name AS account, ta.name AS to_account
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN accounts a ON t.account_id = a.id
    LEFT JOIN accounts ta ON t.to_account_id = ta.id
    WHERE t.user_id = $1
  `;
  const params = [req.user.id];
  let i = 2;
  if (from) { sql += ` AND t.date >= $${i++}`; params.push(from); }
  if (to)   { sql += ` AND t.date <= $${i++}`; params.push(to); }
  sql += ' ORDER BY t.date DESC';

  try {
    const { rows } = await query(sql, params);

    if (format === 'csv') {
      const headers = ['Дата', 'Тип', 'Сума', 'Валюта', 'Категорія', 'Рахунок', 'На рахунок', 'Опис'];
      const typeMap = { income: 'Дохід', expense: 'Витрата', transfer: 'Переказ' };
      const lines = [
        headers.join(','),
        ...rows.map(r => [
          r.date,
          typeMap[r.type] || r.type,
          r.amount,
          r.currency,
          `"${r.category || ''}"`,
          `"${r.account || ''}"`,
          `"${r.to_account || ''}"`,
          `"${(r.description || '').replace(/"/g, '""')}"`,
        ].join(','))
      ];
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
      res.send('\uFEFF' + lines.join('\n')); // BOM for Excel UTF-8
    } else {
      res.setHeader('Content-Disposition', 'attachment; filename=transactions.json');
      res.json(rows);
    }
  } catch (err) {
    console.error('Export error:', err.message);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

module.exports = router;
