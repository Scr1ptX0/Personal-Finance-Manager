-- Personal Finance Manager — Database Schema
-- Run this once to initialize the database

CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  email        VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       VARCHAR(255) NOT NULL,
  type       VARCHAR(20)  NOT NULL CHECK (type IN ('card', 'cash', 'deposit')),
  currency   CHAR(3)      NOT NULL DEFAULT 'UAH',
  balance    DECIMAL(15,2) DEFAULT 0,
  color      VARCHAR(20)  DEFAULT '#10b981',
  icon       VARCHAR(50)  DEFAULT 'CreditCard',
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       VARCHAR(255) NOT NULL,
  type       VARCHAR(10)  NOT NULL CHECK (type IN ('income', 'expense')),
  icon       VARCHAR(50)  DEFAULT 'Tag',
  color      VARCHAR(20)  DEFAULT '#10b981',
  is_default BOOLEAN      DEFAULT FALSE,
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount        DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  currency      CHAR(3) NOT NULL DEFAULT 'UAH',
  category_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  account_id    INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  to_account_id INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  description   TEXT DEFAULT '',
  date          DATE NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budgets (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  amount      DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  currency    CHAR(3) NOT NULL DEFAULT 'UAH',
  period      VARCHAR(10) NOT NULL CHECK (period IN ('monthly', 'weekly')) DEFAULT 'monthly'
);

CREATE TABLE IF NOT EXISTS goals (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name           VARCHAR(255) NOT NULL,
  target_amount  DECIMAL(15,2) NOT NULL CHECK (target_amount > 0),
  current_amount DECIMAL(15,2) DEFAULT 0,
  currency       CHAR(3) NOT NULL DEFAULT 'UAH',
  deadline       DATE,
  color          VARCHAR(20) DEFAULT '#3b82f6',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounts_user       ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user     ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user   ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date   ON transactions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_budgets_user        ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user          ON goals(user_id);
