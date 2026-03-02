const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'data', 'pfm.db');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS accounts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    type       TEXT NOT NULL CHECK (type IN ('card','cash','deposit')),
    currency   TEXT NOT NULL DEFAULT 'UAH',
    balance    REAL DEFAULT 0,
    color      TEXT DEFAULT '#10b981',
    icon       TEXT DEFAULT 'CreditCard',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS categories (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    type       TEXT NOT NULL CHECK (type IN ('income','expense')),
    icon       TEXT DEFAULT 'Tag',
    color      TEXT DEFAULT '#10b981',
    is_default INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS transactions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type          TEXT NOT NULL CHECK (type IN ('income','expense','transfer')),
    amount        REAL NOT NULL CHECK (amount > 0),
    currency      TEXT NOT NULL DEFAULT 'UAH',
    category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    account_id    INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    to_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
    description   TEXT DEFAULT '',
    date          TEXT NOT NULL,
    created_at    TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS budgets (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    amount      REAL NOT NULL CHECK (amount > 0),
    currency    TEXT NOT NULL DEFAULT 'UAH',
    period      TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('monthly','weekly'))
  );
  CREATE TABLE IF NOT EXISTS goals (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name           TEXT NOT NULL,
    target_amount  REAL NOT NULL CHECK (target_amount > 0),
    current_amount REAL DEFAULT 0,
    currency       TEXT NOT NULL DEFAULT 'UAH',
    deadline       TEXT,
    color          TEXT DEFAULT '#3b82f6',
    created_at     TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_accounts_user      ON accounts(user_id);
  CREATE INDEX IF NOT EXISTS idx_categories_user    ON categories(user_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_user  ON transactions(user_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_date  ON transactions(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_budgets_user       ON budgets(user_id);
  CREATE INDEX IF NOT EXISTS idx_goals_user         ON goals(user_id);
`);

console.log(`SQLite DB ready: ${DB_PATH}`);

// Convert PostgreSQL $1,$2 placeholders to SQLite ?
function convertParams(sql) {
  return sql.replace(/\$\d+/g, '?');
}

function getTableName(sql) {
  const m = sql.match(/(?:FROM|INTO|UPDATE)\s+(\w+)/i);
  return m ? m[1] : null;
}

// Drop-in replacement for pg's pool.query — returns { rows }
function query(sql, params = []) {
  const hasReturning = /\bRETURNING\b/i.test(sql);

  if (!hasReturning) {
    const stmt = db.prepare(convertParams(sql));
    if (stmt.reader) {
      return Promise.resolve({ rows: stmt.all(...params) });
    }
    const r = stmt.run(...params);
    return Promise.resolve({ rows: [], changes: r.changes });
  }

  const tableName = getTableName(sql);
  const returningCols = (sql.match(/\bRETURNING\s+(.+)$/i)?.[1] || '*').trim();
  const sqlBase = sql.replace(/\s+RETURNING\s+.+$/i, '').trim();

  // INSERT ... RETURNING
  if (/^\s*INSERT/i.test(sql)) {
    const r = db.prepare(convertParams(sqlBase)).run(...params);
    const row = db.prepare(`SELECT * FROM ${tableName} WHERE rowid = ?`).get(r.lastInsertRowid);
    return Promise.resolve({ rows: row ? [row] : [] });
  }

  // UPDATE ... RETURNING
  if (/^\s*UPDATE/i.test(sql)) {
    db.prepare(convertParams(sqlBase)).run(...params);
    const whereMatch = sqlBase.match(/\bWHERE\b(.+)$/is);
    if (whereMatch) {
      const setMatch = sqlBase.match(/\bSET\b(.+?)\bWHERE\b/is);
      const setNums = setMatch
        ? [...setMatch[1].matchAll(/\$(\d+)/g)].map(m => parseInt(m[1]))
        : [];
      const maxSet = setNums.length ? Math.max(...setNums) : 0;
      const whereConverted = convertParams(whereMatch[1].trim());
      const rows = db.prepare(`SELECT * FROM ${tableName} WHERE ${whereConverted}`).all(...params.slice(maxSet));
      return Promise.resolve({ rows });
    }
    return Promise.resolve({ rows: [] });
  }

  // DELETE ... RETURNING
  if (/^\s*DELETE/i.test(sql)) {
    const whereMatch = sqlBase.match(/\bWHERE\b(.+)$/is);
    if (whereMatch) {
      const selectCols = returningCols === '*' ? '*' : returningCols;
      const whereConverted = convertParams(whereMatch[1].trim());
      const rows = db.prepare(`SELECT ${selectCols} FROM ${tableName} WHERE ${whereConverted}`).all(...params);
      if (rows.length) db.prepare(convertParams(sqlBase)).run(...params);
      return Promise.resolve({ rows });
    }
    return Promise.resolve({ rows: [] });
  }

  return Promise.resolve({ rows: [] });
}

module.exports = { query, db };
