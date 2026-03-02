import type { Account, Transaction, Category, Budget, Goal, User, Currency } from '@/types/finance';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

function getToken(): string | null {
  return localStorage.getItem('pfm-token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Помилка мережі' }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// --- Normalizers: snake_case API → camelCase frontend types ---

function normalizeAccount(r: Record<string, unknown>): Account {
  return {
    id: String(r.id),
    name: r.name as string,
    type: r.type as Account['type'],
    currency: r.currency as Currency,
    balance: Number(r.balance),
    color: (r.color as string) || '#10b981',
    icon: (r.icon as string) || 'CreditCard',
  };
}

function normalizeTransaction(r: Record<string, unknown>): Transaction {
  return {
    id: String(r.id),
    type: r.type as Transaction['type'],
    amount: Number(r.amount),
    currency: r.currency as Currency,
    categoryId: r.category_id ? String(r.category_id) : '',
    accountId: String(r.account_id),
    toAccountId: r.to_account_id ? String(r.to_account_id) : undefined,
    description: (r.description as string) || '',
    date: String(r.date).substring(0, 10),
    categoryName: r.category_name as string | undefined,
    categoryColor: r.category_color as string | undefined,
    accountName: r.account_name as string | undefined,
    toAccountName: r.to_account_name as string | undefined,
  };
}

function normalizeCategory(r: Record<string, unknown>): Category {
  return {
    id: String(r.id),
    name: r.name as string,
    type: r.type as 'income' | 'expense',
    icon: (r.icon as string) || 'Tag',
    color: (r.color as string) || '#10b981',
    isDefault: Boolean(r.is_default),
  };
}

function normalizeBudget(r: Record<string, unknown>): Budget {
  return {
    id: String(r.id),
    categoryId: String(r.category_id),
    amount: Number(r.amount),
    currency: r.currency as Currency,
    period: r.period as Budget['period'],
    categoryName: r.category_name as string | undefined,
    categoryColor: r.category_color as string | undefined,
  };
}

function normalizeGoal(r: Record<string, unknown>): Goal {
  return {
    id: String(r.id),
    name: r.name as string,
    targetAmount: Number(r.target_amount),
    currentAmount: Number(r.current_amount),
    currency: r.currency as Currency,
    deadline: r.deadline ? String(r.deadline).substring(0, 10) : '',
    color: (r.color as string) || '#3b82f6',
  };
}

// --- API client ---

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (name: string, email: string, password: string) =>
    request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  me: () => request<User>('/auth/me'),

  updateProfile: (name: string) =>
    request<User>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ name }),
    }),

  // Accounts
  getAccounts: () =>
    request<Record<string, unknown>[]>('/accounts').then(r => r.map(normalizeAccount)),

  createAccount: (data: Omit<Account, 'id'>) =>
    request<Record<string, unknown>>('/accounts', {
      method: 'POST',
      body: JSON.stringify({ ...data }),
    }).then(normalizeAccount),

  updateAccount: (id: string, data: Omit<Account, 'id'>) =>
    request<Record<string, unknown>>(`/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...data }),
    }).then(normalizeAccount),

  deleteAccount: (id: string) =>
    request<{ success: boolean }>(`/accounts/${id}`, { method: 'DELETE' }),

  // Transactions
  getTransactions: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<Record<string, unknown>[]>(`/transactions${qs}`).then(r =>
      r.map(normalizeTransaction)
    );
  },

  createTransaction: (data: {
    type: string;
    amount: number;
    currency: string;
    category_id?: string | null;
    account_id: string;
    to_account_id?: string | null;
    description?: string;
    date: string;
  }) =>
    request<Record<string, unknown>>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(normalizeTransaction),

  deleteTransaction: (id: string) =>
    request<{ success: boolean }>(`/transactions/${id}`, { method: 'DELETE' }),

  updateTransaction: (id: string, data: {
    type: string;
    amount: number;
    currency: string;
    category_id?: string | null;
    account_id: string;
    to_account_id?: string | null;
    description?: string;
    date: string;
  }) =>
    request<Record<string, unknown>>(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).then(normalizeTransaction),

  // Categories
  getCategories: () =>
    request<Record<string, unknown>[]>('/categories').then(r => r.map(normalizeCategory)),

  createCategory: (data: Omit<Category, 'id' | 'isDefault'>) =>
    request<Record<string, unknown>>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(normalizeCategory),

  deleteCategory: (id: string) =>
    request<{ success: boolean }>(`/categories/${id}`, { method: 'DELETE' }),

  // Budgets
  getBudgets: () =>
    request<Record<string, unknown>[]>('/budgets').then(r => r.map(normalizeBudget)),

  createBudget: (data: { category_id: string; amount: number; currency?: string; period?: string }) =>
    request<Record<string, unknown>>('/budgets', {
      method: 'POST',
      body: JSON.stringify(data),
    }).then(normalizeBudget),

  updateBudget: (id: string, data: { amount: number; period?: string }) =>
    request<Record<string, unknown>>(`/budgets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }).then(normalizeBudget),

  deleteBudget: (id: string) =>
    request<{ success: boolean }>(`/budgets/${id}`, { method: 'DELETE' }),

  // Goals
  getGoals: () =>
    request<Record<string, unknown>[]>('/goals').then(r => r.map(normalizeGoal)),

  createGoal: (data: Omit<Goal, 'id'>) =>
    request<Record<string, unknown>>('/goals', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        target_amount: data.targetAmount,
        current_amount: data.currentAmount,
        currency: data.currency,
        deadline: data.deadline || null,
        color: data.color,
      }),
    }).then(normalizeGoal),

  updateGoal: (id: string, data: Goal) =>
    request<Record<string, unknown>>(`/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: data.name,
        target_amount: data.targetAmount,
        current_amount: data.currentAmount,
        currency: data.currency,
        deadline: data.deadline || null,
        color: data.color,
      }),
    }).then(normalizeGoal),

  deleteGoal: (id: string) =>
    request<{ success: boolean }>(`/goals/${id}`, { method: 'DELETE' }),

  // Export (returns raw Response for download)
  exportTransactions: async (format: 'csv' | 'json', params?: Record<string, string>) => {
    const token = getToken();
    const qs = new URLSearchParams({ format, ...params }).toString();
    const res = await fetch(`${BASE_URL}/export?${qs}`, {
      headers: { Authorization: `Bearer ${token || ''}` },
    });
    if (!res.ok) throw new Error('Помилка експорту');
    return res;
  },
};
