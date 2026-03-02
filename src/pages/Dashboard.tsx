import { useFinance } from '@/store/finance-context';
import { formatMoney } from '@/lib/format';
import { CURRENCIES } from '@/types/finance';
import {
  TrendingUp, TrendingDown, ArrowLeftRight, Wallet,
  CreditCard, Banknote, Landmark,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid,
} from 'recharts';
import { useMemo } from 'react';

const iconMap: Record<string, React.ElementType> = { CreditCard, Banknote, Landmark };

function getCurrentMonth() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function getMonthLabel() {
  return new Date().toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' });
}

export default function Dashboard() {
  const { accounts, transactions, categories, budgets, goals, isLoading } = useFinance();

  const currentMonth = getCurrentMonth();
  const monthTx = useMemo(
    () => transactions.filter(t => t.date.startsWith(currentMonth)),
    [transactions, currentMonth]
  );

  const uahAccounts = accounts.filter(a => a.currency === 'UAH');
  const totalBalanceUAH = uahAccounts.reduce((s, a) => s + a.balance, 0);
  const totalIncome = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    monthTx.filter(t => t.type === 'expense').forEach(t => {
      map[t.categoryId] = (map[t.categoryId] || 0) + t.amount;
    });
    return Object.entries(map)
      .map(([catId, amount]) => {
        const cat = categories.find(c => c.id === catId);
        return { name: cat?.name || 'Інше', value: amount, color: cat?.color || '#888' };
      })
      .sort((a, b) => b.value - a.value);
  }, [monthTx, categories]);

  const cashFlowData = useMemo(() => {
    const days: Record<string, { income: number; expense: number }> = {};
    monthTx.forEach(t => {
      const day = t.date.substring(8);
      if (!days[day]) days[day] = { income: 0, expense: 0 };
      if (t.type === 'income') days[day].income += t.amount;
      if (t.type === 'expense') days[day].expense += t.amount;
    });
    return Object.entries(days)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, data]) => ({ day, ...data }));
  }, [monthTx]);

  // Budget overview for current month
  const budgetStatus = useMemo(() => {
    const spent: Record<string, number> = {};
    monthTx.filter(t => t.type === 'expense').forEach(t => {
      spent[t.categoryId] = (spent[t.categoryId] || 0) + t.amount;
    });
    return budgets.map(b => ({
      ...b,
      spent: spent[b.categoryId] || 0,
      pct: Math.min(Math.round(((spent[b.categoryId] || 0) / b.amount) * 100), 100),
      over: (spent[b.categoryId] || 0) > b.amount,
    }));
  }, [budgets, monthTx]);

  const recentTx = transactions.slice(0, 6);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-muted rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 bg-muted rounded-xl" />
          <div className="h-72 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Дашборд</h1>
        <p className="text-muted-foreground text-sm mt-1 capitalize">{getMonthLabel()}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-muted-foreground text-xs">Загальний баланс</span>
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <p className="text-xl font-bold font-mono">{formatMoney(totalBalanceUAH, 'UAH')}</p>
          <p className="text-xs text-muted-foreground mt-1">тільки UAH рахунки</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-muted-foreground text-xs">Доходи</span>
            <TrendingUp className="h-4 w-4 text-income" />
          </div>
          <p className="text-xl font-bold font-mono text-income">{formatMoney(totalIncome, 'UAH')}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-muted-foreground text-xs">Витрати</span>
            <TrendingDown className="h-4 w-4 text-expense" />
          </div>
          <p className="text-xl font-bold font-mono text-expense">{formatMoney(totalExpense, 'UAH')}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-muted-foreground text-xs">Cash Flow</span>
            <ArrowLeftRight className="h-4 w-4 text-transfer" />
          </div>
          <p className={`text-xl font-bold font-mono ${totalIncome - totalExpense >= 0 ? 'text-income' : 'text-expense'}`}>
            {totalIncome - totalExpense >= 0 ? '+' : ''}{formatMoney(totalIncome - totalExpense, 'UAH')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash flow chart */}
        <div className="lg:col-span-2 glass-card p-5">
          <h3 className="font-semibold mb-4 text-sm">Доходи vs Витрати за {getMonthLabel()}</h3>
          {cashFlowData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
              Немає транзакцій за поточний місяць
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} width={60} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="income" fill="hsl(var(--income))" radius={[4, 4, 0, 0]} name="Доходи" />
                  <Bar dataKey="expense" fill="hsl(var(--expense))" radius={[4, 4, 0, 0]} name="Витрати" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Pie chart */}
        <div className="glass-card p-5">
          <h3 className="font-semibold mb-4 text-sm">Витрати за категоріями</h3>
          {expenseByCategory.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              Немає витрат
            </div>
          ) : (
            <>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expenseByCategory} dataKey="value" cx="50%" cy="50%" outerRadius={72} innerRadius={40}>
                      {expenseByCategory.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatMoney(value, 'UAH')}
                      contentStyle={{
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-2">
                {expenseByCategory.slice(0, 5).map(cat => (
                  <div key={cat.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="truncate max-w-[90px]">{cat.name}</span>
                    </div>
                    <span className="font-mono text-muted-foreground">{formatMoney(cat.value, 'UAH')}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accounts */}
        <div className="glass-card p-5">
          <h3 className="font-semibold mb-4 text-sm">Рахунки</h3>
          {accounts.length === 0 ? (
            <p className="text-muted-foreground text-sm">Ще немає рахунків</p>
          ) : (
            <div className="space-y-2.5">
              {accounts.map(acc => {
                const Icon = iconMap[acc.icon] || CreditCard;
                return (
                  <div key={acc.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: acc.color + '20' }}>
                        <Icon className="h-4 w-4" style={{ color: acc.color }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{acc.name}</p>
                        <p className="text-xs text-muted-foreground">{CURRENCIES[acc.currency]?.name}</p>
                      </div>
                    </div>
                    <p className="font-mono font-semibold text-sm">{formatMoney(acc.balance, acc.currency)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent transactions */}
        <div className="glass-card p-5">
          <h3 className="font-semibold mb-4 text-sm">Останні транзакції</h3>
          {recentTx.length === 0 ? (
            <p className="text-muted-foreground text-sm">Ще немає транзакцій</p>
          ) : (
            <div className="space-y-3">
              {recentTx.map(tx => {
                const cat = categories.find(c => c.id === tx.categoryId);
                return (
                  <div key={tx.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        tx.type === 'income' ? 'bg-income/10 text-income' :
                        tx.type === 'expense' ? 'bg-expense/10 text-expense' :
                        'bg-transfer/10 text-transfer'
                      }`}>
                        {tx.type === 'income' ? '↑' : tx.type === 'expense' ? '↓' : '↔'}
                      </div>
                      <div>
                        <p className="text-sm font-medium truncate max-w-[140px]">{tx.description || 'Без опису'}</p>
                        <p className="text-xs text-muted-foreground">{cat?.name || tx.categoryName || 'Переказ'} · {tx.date}</p>
                      </div>
                    </div>
                    <p className={`font-mono text-sm font-semibold shrink-0 ${
                      tx.type === 'income' ? 'text-income' : tx.type === 'expense' ? 'text-expense' : 'text-transfer'
                    }`}>
                      {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}{formatMoney(tx.amount, tx.currency)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Budget overview */}
      {budgetStatus.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="font-semibold mb-4 text-sm">Бюджети за місяць</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgetStatus.map(b => (
              <div key={b.id} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{b.categoryName || 'Категорія'}</span>
                  <span className={`font-mono text-xs ${b.over ? 'text-expense' : 'text-muted-foreground'}`}>
                    {b.pct}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${b.over ? 'bg-destructive' : 'bg-primary'}`}
                    style={{ width: `${b.pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground font-mono">
                  <span>{formatMoney(b.spent, 'UAH')}</span>
                  <span>{formatMoney(b.amount, 'UAH')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Goals */}
      {goals.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="font-semibold mb-4 text-sm">Фінансові цілі</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {goals.map(goal => {
              const pct = Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);
              return (
                <div key={goal.id} className="p-4 rounded-lg bg-muted/50">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-medium text-sm">{goal.name}</p>
                    <span className="text-xs font-semibold" style={{ color: goal.color }}>{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden mb-2">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: goal.color }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground font-mono">
                    <span>{formatMoney(goal.currentAmount, goal.currency)}</span>
                    <span>{formatMoney(goal.targetAmount, goal.currency)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
