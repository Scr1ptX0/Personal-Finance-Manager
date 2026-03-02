// Seed realistic demo data for user test@pfm.com
// Run: node db/seed.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { db } = require('../db');

const TEST_EMAIL = 'test@pfm.com';
const TEST_PASSWORD = '123456';
const TEST_NAME = 'Test User';

const DEFAULT_CATEGORIES = [
  ['Зарплата',    'income',  'Briefcase',   '#10b981'],
  ['Фріланс',     'income',  'Laptop',      '#06b6d4'],
  ['Інвестиції',  'income',  'TrendingUp',  '#8b5cf6'],
  ['Продукти',    'expense', 'ShoppingCart','#f59e0b'],
  ['Транспорт',   'expense', 'Car',         '#3b82f6'],
  ['Розваги',     'expense', 'Gamepad2',    '#ec4899'],
  ['Комунальні',  'expense', 'Home',        '#f97316'],
  ["Здоров'я",    'expense', 'Heart',       '#ef4444'],
  ['Одяг',        'expense', 'Shirt',       '#a855f7'],
  ['Кафе',        'expense', 'Coffee',      '#78716c'],
];

// Create user if not exists
let user = db.prepare('SELECT id FROM users WHERE email=?').get(TEST_EMAIL);
if (!user) {
  const hash = bcrypt.hashSync(TEST_PASSWORD, 12);
  const r = db.prepare(
    'INSERT INTO users (name, email, password_hash) VALUES (?,?,?)'
  ).run(TEST_NAME, TEST_EMAIL, hash);
  user = { id: r.lastInsertRowid };
  for (const [name, type, icon, color] of DEFAULT_CATEGORIES) {
    db.prepare(
      'INSERT INTO categories (user_id, name, type, icon, color, is_default) VALUES (?,?,?,?,?,1)'
    ).run(user.id, name, type, icon, color);
  }
  console.log(`Created user: ${TEST_EMAIL} / ${TEST_PASSWORD}`);
} else {
  console.log(`User already exists: ${TEST_EMAIL}`);
}

const USER_ID = user.id;

function d(daysAgo) {
  const dt = new Date();
  dt.setDate(dt.getDate() - daysAgo);
  return dt.toISOString().substring(0, 10);
}

// ─── Clear existing data for this user ───────────────────────────────────────
db.prepare('DELETE FROM goals        WHERE user_id=?').run(USER_ID);
db.prepare('DELETE FROM budgets      WHERE user_id=?').run(USER_ID);
db.prepare('DELETE FROM transactions WHERE user_id=?').run(USER_ID);
db.prepare('DELETE FROM accounts     WHERE user_id=?').run(USER_ID);

// ─── Accounts ────────────────────────────────────────────────────────────────
const insertAcc = db.prepare(
  `INSERT INTO accounts (user_id, name, type, currency, balance, color, icon)
   VALUES (?,?,?,?,?,?,?)`
);

const cardId    = insertAcc.run(USER_ID, 'Картка ПриватБанк', 'card',    'UAH', 0, '#10b981', 'CreditCard').lastInsertRowid;
const cashId    = insertAcc.run(USER_ID, 'Готівка',           'cash',    'UAH', 0, '#f59e0b', 'Banknote').lastInsertRowid;
const depositId = insertAcc.run(USER_ID, 'Депозит Моно',      'deposit', 'UAH', 0, '#3b82f6', 'Landmark').lastInsertRowid;

// ─── Get category ids ────────────────────────────────────────────────────────
const cats = db.prepare('SELECT id, name FROM categories WHERE user_id=?').all(USER_ID);
function cat(name) {
  const c = cats.find(r => r.name === name);
  if (!c) { console.error(`Category not found: ${name}`); process.exit(1); }
  return c.id;
}

const catSalary    = cat('Зарплата');
const catFreelance = cat('Фріланс');
const catFood      = cat('Продукти');
const catTransport = cat('Транспорт');
const catFun       = cat('Розваги');
const catUtils     = cat('Комунальні');
const catHealth    = cat('Здоров\'я');
const catClothes   = cat('Одяг');
const catCafe      = cat('Кафе');
const catInvest    = cat('Інвестиції');

// ─── Transactions ─────────────────────────────────────────────────────────────
const insertTx = db.prepare(
  `INSERT INTO transactions (user_id, type, amount, currency, category_id, account_id, to_account_id, description, date)
   VALUES (?,?,?,?,?,?,?,?,?)`
);

const tx = (type, amount, catId, accId, desc, daysAgo, toAccId = null) =>
  insertTx.run(USER_ID, type, amount, 'UAH', catId, accId, toAccId, desc, d(daysAgo));

// ── Місяць 3 (~60-90 днів тому) ──────────────────────────────────────────────
tx('income',  42000, catSalary,    cardId,    'Зарплата за грудень',          88);
tx('income',   8500, catFreelance, cardId,    'Проєкт e-commerce сайт',       82);
tx('expense',  6200, catFood,      cardId,    'АТБ — місячний запас',         85);
tx('expense',  1800, catTransport, cardId,    'Проїзд, метро/маршрутки',      84);
tx('expense',  2400, catUtils,     cardId,    'Комунальні платежі',           80);
tx('expense',   950, catCafe,      cashId,    'Кафе з друзями',               79);
tx('expense',  3200, catFun,       cardId,    'Кінотеатр + боулінг',          76);
tx('expense',  1100, catHealth,    cardId,    'Аптека, вітаміни',             73);
tx('expense',  4500, catClothes,   cardId,    'Зимові черевики',              71);
tx('expense',   780, catFood,      cashId,    'Ринок, овочі-фрукти',          68);
tx('transfer', 5000, null,         cardId,    'На депозит',                   65, depositId);
tx('transfer', 4000, null,         cardId,    'Зняв готівку',                 70, cashId);
tx('income',   3500, catFreelance, cardId,    'Дизайн логотипу',              63);

// ── Місяць 2 (~30-60 днів тому) ──────────────────────────────────────────────
tx('income',  42000, catSalary,    cardId,    'Зарплата за січень',           58);
tx('expense',  5900, catFood,      cardId,    'Сільпо + АТБ',                 57);
tx('expense',  2100, catTransport, cardId,    'Uber, метро, маршрутки',       55);
tx('expense',  2400, catUtils,     cardId,    'Комунальні + інтернет',        53);
tx('expense',   620, catCafe,      cashId,    'Кава, ланч з колегою',         51);
tx('expense',  1890, catFun,       cardId,    'Netflix + Spotify + Steam',    49);
tx('expense',  2750, catHealth,    cardId,    'Стоматолог',                   47);
tx('expense',   430, catFood,      cashId,    'Хліб, молочні продукти',       44);
tx('income',   6200, catFreelance, cardId,    'Розробка Telegram-бота',       42);
tx('expense',  1200, catTransport, cardId,    'Таксі + Bolt',                 40);
tx('expense',  3600, catCafe,      cardId,    'Ресторан на День народження',  37);
tx('transfer', 3000, null,         cardId,    'Зняв готівку',                 35, cashId);
tx('expense',   850, catFood,      cashId,    'Овочевий ринок',               33);
tx('income',   1500, catInvest,    cardId,    'Відсотки по депозиту',         31);

// ── Місяць 1 (~0-30 днів тому) ────────────────────────────────────────────────
tx('income',  42000, catSalary,    cardId,    'Зарплата за лютий',            28);
tx('expense',  6100, catFood,      cardId,    'Продуктовий кошик місяць',     27);
tx('expense',  1950, catTransport, cardId,    'Проїзд, Uber',                 26);
tx('expense',  2400, catUtils,     cardId,    'Комунальні платежі',           24);
tx('expense',   740, catCafe,      cashId,    'Кавʼярня, снеки',              23);
tx('expense',  1100, catFun,       cardId,    'Кіно, ігри',                   21);
tx('income',   9500, catFreelance, cardId,    'Верстка лендингу + CRM',       19);
tx('expense',   580, catHealth,    cardId,    'Аптека',                       17);
tx('expense',  5800, catClothes,   cardId,    'Весняний гардероб',            15);
tx('expense',   920, catCafe,      cardId,    'Суші-бар з сімʼєю',            13);
tx('expense',  1680, catFood,      cardId,    'Сільпо, Novus',                11);
tx('expense',   450, catTransport, cashId,    'Маршрутка + метро',             9);
tx('income',   2000, catFreelance, cardId,    'Правки по проєкту',             7);
tx('expense',  3200, catFun,       cardId,    'Квитки на концерт',             5);
tx('expense',   870, catFood,      cashId,    'Базар, свіжі продукти',         3);
tx('expense',   680, catCafe,      cashId,    'Ланч та кава',                  2);
tx('expense',   390, catTransport, cardId,    'Bolt',                          1);

// ─── Recalculate actual balances ──────────────────────────────────────────────
function recalcBalance(accId) {
  const r = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type='income'   AND account_id=?    THEN amount ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN type='expense'  AND account_id=?    THEN amount ELSE 0 END), 0)
    - COALESCE(SUM(CASE WHEN type='transfer' AND account_id=?    THEN amount ELSE 0 END), 0)
    + COALESCE(SUM(CASE WHEN type='transfer' AND to_account_id=? THEN amount ELSE 0 END), 0)
    AS bal
    FROM transactions WHERE user_id=?
  `).get(accId, accId, accId, accId, USER_ID);
  db.prepare('UPDATE accounts SET balance=? WHERE id=?').run(r.bal, accId);
}
recalcBalance(cardId);
recalcBalance(cashId);
recalcBalance(depositId);

// ─── Budgets ──────────────────────────────────────────────────────────────────
const insertBudget = db.prepare(
  `INSERT INTO budgets (user_id, category_id, amount, currency, period) VALUES (?,?,?,?,?)`
);
insertBudget.run(USER_ID, catFood,      8000, 'UAH', 'monthly');
insertBudget.run(USER_ID, catTransport, 2500, 'UAH', 'monthly');
insertBudget.run(USER_ID, catFun,       3000, 'UAH', 'monthly');
insertBudget.run(USER_ID, catCafe,      1500, 'UAH', 'monthly');
insertBudget.run(USER_ID, catHealth,    1000, 'UAH', 'monthly');

// ─── Goals ───────────────────────────────────────────────────────────────────
const insertGoal = db.prepare(
  `INSERT INTO goals (user_id, name, target_amount, current_amount, currency, deadline, color)
   VALUES (?,?,?,?,?,?,?)`
);
insertGoal.run(USER_ID, 'Відпустка в Єгипті',  45000,  18000, 'UAH', d(-120), '#f59e0b');
insertGoal.run(USER_ID, 'Новий MacBook Pro',   80000,  32000, 'UAH', d(-180), '#3b82f6');
insertGoal.run(USER_ID, 'Ремонт квартири',    150000,  45000, 'UAH', d(-365), '#8b5cf6');
insertGoal.run(USER_ID, 'Резервний фонд',      60000,  53000, 'UAH', null,    '#10b981');

// ─── Summary ─────────────────────────────────────────────────────────────────
const accs    = db.prepare('SELECT name, balance FROM accounts WHERE user_id=?').all(USER_ID);
const txCount = db.prepare('SELECT COUNT(*) as n FROM transactions WHERE user_id=?').get(USER_ID);
console.log('\n✅ Seed completed!\n');
console.log('Accounts:');
accs.forEach(a => console.log(`  ${a.name}: ₴${Number(a.balance).toFixed(2)}`));
console.log(`\nTransactions: ${txCount.n}`);
console.log('Budgets: 5');
console.log('Goals: 4\n');
