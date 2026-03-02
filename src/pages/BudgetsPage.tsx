import { useFinance } from '@/store/finance-context';
import { formatMoney } from '@/lib/format';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { Budget } from '@/types/finance';

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function BudgetsPage() {
  const { budgets, categories, transactions, addBudget, updateBudget, deleteBudget } = useFinance();

  const [addOpen, setAddOpen] = useState(false);
  const [catId, setCatId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const [editBudget, setEditBudget] = useState<Budget | null>(null);
  const [editAmount, setEditAmount] = useState('');

  const currentMonth = getCurrentMonth();
  const expenseCategories = categories.filter(c => c.type === 'expense');

  const spentByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
      .forEach(t => { map[t.categoryId] = (map[t.categoryId] || 0) + t.amount; });
    return map;
  }, [transactions, currentMonth]);

  const handleAdd = async () => {
    if (!catId || !amount) return;
    setLoading(true);
    try {
      await addBudget({ categoryId: catId, amount: parseFloat(amount), currency: 'UAH', period: 'monthly' });
      toast.success('Бюджет створено');
      setCatId(''); setAmount(''); setAddOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (budget: Budget) => {
    setEditBudget(budget);
    setEditAmount(String(budget.amount));
  };

  const handleEdit = async () => {
    if (!editBudget || !editAmount) return;
    setLoading(true);
    try {
      await updateBudget(editBudget.id, { amount: parseFloat(editAmount) });
      toast.success('Бюджет оновлено');
      setEditBudget(null);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBudget(id);
      toast.success('Бюджет видалено');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const monthLabel = new Date().toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Бюджети</h1>
          <p className="text-muted-foreground text-sm mt-1 capitalize">Контроль витрат · {monthLabel}</p>
        </div>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Додати
        </Button>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Новий бюджет</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Категорія витрат</Label>
              <Select value={catId} onValueChange={setCatId}>
                <SelectTrigger><SelectValue placeholder="Оберіть категорію" /></SelectTrigger>
                <SelectContent>
                  {expenseCategories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Місячний ліміт (₴)</Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" min="0" step="100" />
            </div>
            <Button onClick={handleAdd} className="w-full" disabled={loading}>
              {loading ? 'Збереження...' : 'Створити'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editBudget} onOpenChange={open => { if (!open) setEditBudget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Редагувати · {categories.find(c => c.id === editBudget?.categoryId)?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Новий місячний ліміт (₴)</Label>
              <Input
                type="number"
                value={editAmount}
                onChange={e => setEditAmount(e.target.value)}
                placeholder="0"
                min="0"
                step="100"
                autoFocus
              />
            </div>
            <Button onClick={handleEdit} className="w-full" disabled={loading}>
              {loading ? 'Збереження...' : 'Зберегти'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {budgets.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="font-medium">Бюджетів ще немає</p>
          <p className="text-muted-foreground text-sm mt-1">Встановіть ліміти витрат за категоріями</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map(budget => {
            const cat = categories.find(c => c.id === budget.categoryId);
            const spent = spentByCategory[budget.categoryId] || 0;
            const pct = Math.min(Math.round((spent / budget.amount) * 100), 100);
            const over = spent > budget.amount;
            const catColor = cat?.color || budget.categoryColor || '#10b981';

            return (
              <div key={budget.id} className="stat-card group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: catColor }} />
                    <div>
                      <p className="font-medium text-sm">{cat?.name || budget.categoryName || 'Категорія'}</p>
                      <p className="text-xs text-muted-foreground">Щомісячний</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(budget)} className="text-muted-foreground hover:text-foreground">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(budget.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full transition-all ${over ? 'bg-destructive' : 'bg-primary'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className={`font-mono font-semibold ${over ? 'text-expense' : ''}`}>
                    {formatMoney(spent, 'UAH')}
                  </span>
                  <span className="text-muted-foreground font-mono">
                    {formatMoney(budget.amount, 'UAH')}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-xs ${over ? 'text-expense' : 'text-muted-foreground'}`}>
                    {pct}% використано
                  </span>
                  {over && (
                    <span className="text-xs text-expense font-mono">
                      +{formatMoney(spent - budget.amount, 'UAH')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}