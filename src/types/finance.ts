export type Currency = 'UAH' | 'USD' | 'EUR' | 'GBP' | 'PLN';

export type AccountType = 'card' | 'cash' | 'deposit';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  balance: number;
  color: string;
  icon: string;
}

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  categoryId: string;
  accountId: string;
  toAccountId?: string;
  description: string;
  date: string;
  // Populated from API joins
  categoryName?: string;
  categoryColor?: string;
  accountName?: string;
  toAccountName?: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  isDefault?: boolean;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  currency: Currency;
  period: 'monthly' | 'weekly';
  categoryName?: string;
  categoryColor?: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  currency: Currency;
  deadline: string;
  color: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
}

export const CURRENCIES: Record<Currency, { symbol: string; name: string }> = {
  UAH: { symbol: '₴', name: 'Гривня' },
  USD: { symbol: '$', name: 'Долар США' },
  EUR: { symbol: '€', name: 'Євро' },
  GBP: { symbol: '£', name: 'Фунт стерлінгів' },
  PLN: { symbol: 'zł', name: 'Злотий' },
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  card: 'Картка',
  cash: 'Готівка',
  deposit: 'Депозит',
};
