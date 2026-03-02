import { useFinance } from '@/store/finance-context';
import { formatMoney } from '@/lib/format';
import { Plus, Trash2, Target } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const GOAL_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#f97316'];

export default function GoalsPage() {
  const { goals, addGoal, updateGoal, deleteGoal } = useFinance();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!name.trim() || !target) return;
    setLoading(true);
    try {
      await addGoal({
        name: name.trim(),
        targetAmount: parseFloat(target),
        currentAmount: parseFloat(current) || 0,
        currency: 'UAH',
        deadline: deadline || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
        color: GOAL_COLORS[goals.length % GOAL_COLORS.length],
      });
      toast.success('Ціль створено');
      setName(''); setTarget(''); setCurrent(''); setDeadline(''); setOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const addFunds = async (goal: (typeof goals)[0], amount: number) => {
    try {
      await updateGoal({ ...goal, currentAmount: goal.currentAmount + amount });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteGoal(id);
      toast.success('Ціль видалено');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Фінансові цілі</h1>
          <p className="text-muted-foreground text-sm mt-1">Відстежуйте прогрес накопичень</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Додати
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Нова ціль</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Назва</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="На що збираєте?" />
            </div>
            <div>
              <Label>Цільова сума (₴)</Label>
              <Input type="number" value={target} onChange={e => setTarget(e.target.value)} placeholder="0" min="0" step="1000" />
            </div>
            <div>
              <Label>Вже накопичено (₴)</Label>
              <Input type="number" value={current} onChange={e => setCurrent(e.target.value)} placeholder="0" min="0" />
            </div>
            <div>
              <Label>Дедлайн</Label>
              <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>
            <Button onClick={handleAdd} className="w-full" disabled={loading}>
              {loading ? 'Збереження...' : 'Створити'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {goals.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Target className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">Цілей ще немає</p>
          <p className="text-muted-foreground text-sm mt-1">Встановіть фінансову ціль та відстежуйте прогрес</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {goals.map(goal => {
            const pct = Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);
            const remaining = goal.targetAmount - goal.currentAmount;
            const achieved = remaining <= 0;

            return (
              <div key={goal.id} className="stat-card group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: goal.color + '20' }}>
                      <Target className="h-5 w-5" style={{ color: goal.color }} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{goal.name}</p>
                      {goal.deadline && (
                        <p className="text-xs text-muted-foreground">до {goal.deadline}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(goal.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="h-3 rounded-full bg-muted overflow-hidden mb-3">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: goal.color }}
                  />
                </div>

                <div className="flex justify-between items-end mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Накопичено</p>
                    <p className="font-mono font-bold text-sm">{formatMoney(goal.currentAmount, goal.currency)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Ціль</p>
                    <p className="font-mono font-semibold text-sm text-muted-foreground">{formatMoney(goal.targetAmount, goal.currency)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold" style={{ color: goal.color }}>{pct}%</span>
                  {achieved ? (
                    <span className="text-sm font-semibold text-income">✓ Досягнуто!</span>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => addFunds(goal, 1000)}>
                      + ₴1,000
                    </Button>
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
