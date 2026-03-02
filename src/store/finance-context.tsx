import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import type { Account, Transaction, Category, Budget, Goal } from '@/types/finance';
import { useAuth } from '@/contexts/AuthContext';

interface FinanceState {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  goals: Goal[];
  isLoading: boolean;
}

interface FinanceContextType extends FinanceState {
  addAccount: (account: Omit<Account, 'id'>) => Promise<void>;
  updateAccount: (account: Account) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  addTransaction: (tx: Omit<Transaction, 'id' | 'categoryName' | 'categoryColor' | 'accountName' | 'toAccountName'>) => Promise<void>;
  updateTransaction: (tx: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'isDefault'>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addBudget: (budget: Omit<Budget, 'id' | 'categoryName' | 'categoryColor'>) => Promise<void>;
  updateBudget: (id: string, data: { amount: number; period?: string }) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  addGoal: (goal: Omit<Goal, 'id'>) => Promise<void>;
  updateGoal: (goal: Goal) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  refetch: () => void;
}

const FinanceContext = createContext<FinanceContextType | null>(null);

const EMPTY: FinanceState = {
  accounts: [],
  transactions: [],
  categories: [],
  budgets: [],
  goals: [],
  isLoading: true,
};

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<FinanceState>(EMPTY);

  const fetchAll = useCallback(() => {
    if (!user) return;
    setState(s => ({ ...s, isLoading: true }));
    Promise.all([
      api.getAccounts(),
      api.getTransactions(),
      api.getCategories(),
      api.getBudgets(),
      api.getGoals(),
    ])
      .then(([accounts, transactions, categories, budgets, goals]) => {
        setState({ accounts, transactions, categories, budgets, goals, isLoading: false });
      })
      .catch((err) => {
        console.error('Failed to load data:', err);
        toast.error('Не вдалося завантажити дані');
        setState(s => ({ ...s, isLoading: false }));
      });
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // --- Accounts ---
  const addAccount = useCallback(async (account: Omit<Account, 'id'>) => {
    const created = await api.createAccount(account);
    setState(s => ({ ...s, accounts: [...s.accounts, created] }));
  }, []);

  const updateAccount = useCallback(async (account: Account) => {
    const { id, ...data } = account;
    const updated = await api.updateAccount(id, data);
    setState(s => ({ ...s, accounts: s.accounts.map(a => a.id === id ? updated : a) }));
  }, []);

  const deleteAccount = useCallback(async (id: string) => {
    await api.deleteAccount(id);
    setState(s => ({ ...s, accounts: s.accounts.filter(a => a.id !== id) }));
  }, []);

  // --- Transactions ---
  const addTransaction = useCallback(async (
    tx: Omit<Transaction, 'id' | 'categoryName' | 'categoryColor' | 'accountName' | 'toAccountName'>
  ) => {
    await api.createTransaction({
      type: tx.type,
      amount: tx.amount,
      currency: tx.currency,
      category_id: tx.categoryId || null,
      account_id: tx.accountId,
      to_account_id: tx.toAccountId || null,
      description: tx.description,
      date: tx.date,
    });
    // Refetch both transactions and accounts (balances changed)
    const [accounts, transactions] = await Promise.all([
      api.getAccounts(),
      api.getTransactions(),
    ]);
    setState(s => ({ ...s, accounts, transactions }));
  }, []);

  const updateTransaction = useCallback(async (tx: Transaction) => {
    await api.updateTransaction(tx.id, {
      type: tx.type,
      amount: tx.amount,
      currency: tx.currency,
      category_id: tx.categoryId || null,
      account_id: tx.accountId,
      to_account_id: tx.toAccountId || null,
      description: tx.description,
      date: tx.date,
    });
    const [accounts, transactions] = await Promise.all([
      api.getAccounts(),
      api.getTransactions(),
    ]);
    setState(s => ({ ...s, accounts, transactions }));
  }, []);

  const deleteTransaction = useCallback(async (id: string) => {
    await api.deleteTransaction(id);
    const [accounts, transactions] = await Promise.all([
      api.getAccounts(),
      api.getTransactions(),
    ]);
    setState(s => ({ ...s, accounts, transactions }));
  }, []);

  // --- Categories ---
  const addCategory = useCallback(async (cat: Omit<Category, 'id' | 'isDefault'>) => {
    const created = await api.createCategory(cat);
    setState(s => ({ ...s, categories: [...s.categories, created] }));
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    await api.deleteCategory(id);
    setState(s => ({ ...s, categories: s.categories.filter(c => c.id !== id) }));
  }, []);

  // --- Budgets ---
  const addBudget = useCallback(async (
    budget: Omit<Budget, 'id' | 'categoryName' | 'categoryColor'>
  ) => {
    await api.createBudget({
      category_id: budget.categoryId,
      amount: budget.amount,
      currency: budget.currency,
      period: budget.period,
    });
    const budgets = await api.getBudgets();
    setState(s => ({ ...s, budgets }));
  }, []);

  const updateBudget = useCallback(async (id: string, data: { amount: number; period?: string }) => {
    const updated = await api.updateBudget(id, data);
    setState(s => ({ ...s, budgets: s.budgets.map(b => b.id === id ? updated : b) }));
  }, []);

  const deleteBudget = useCallback(async (id: string) => {
    await api.deleteBudget(id);
    setState(s => ({ ...s, budgets: s.budgets.filter(b => b.id !== id) }));
  }, []);

  // --- Goals ---
  const addGoal = useCallback(async (goal: Omit<Goal, 'id'>) => {
    const created = await api.createGoal(goal);
    setState(s => ({ ...s, goals: [created, ...s.goals] }));
  }, []);

  const updateGoal = useCallback(async (goal: Goal) => {
    const updated = await api.updateGoal(goal.id, goal);
    setState(s => ({ ...s, goals: s.goals.map(g => g.id === goal.id ? updated : g) }));
  }, []);

  const deleteGoal = useCallback(async (id: string) => {
    await api.deleteGoal(id);
    setState(s => ({ ...s, goals: s.goals.filter(g => g.id !== id) }));
  }, []);

  return (
    <FinanceContext.Provider value={{
      ...state,
      addAccount, updateAccount, deleteAccount,
      addTransaction, updateTransaction, deleteTransaction,
      addCategory, deleteCategory,
      addBudget, updateBudget, deleteBudget,
      addGoal, updateGoal, deleteGoal,
      refetch: fetchAll,
    }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider');
  return ctx;
}
