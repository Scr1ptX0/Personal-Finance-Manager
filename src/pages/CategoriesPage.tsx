import { useFinance } from '@/store/finance-context';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const DEFAULT_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316', '#ef4444', '#78716c'];

export default function CategoriesPage() {
  const { categories, addCategory, deleteCategory } = useFinance();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await addCategory({
        name: name.trim(),
        type,
        icon: 'Tag',
        color: DEFAULT_COLORS[categories.length % DEFAULT_COLORS.length],
      });
      toast.success('Категорію створено');
      setName(''); setOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteCategory(id);
      toast.success(`Категорію "${name}" видалено`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  const renderCategory = (cat: (typeof categories)[0]) => (
    <div key={cat.id} className="glass-card p-4 flex items-center justify-between group">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: cat.color + '20' }}>
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
        </div>
        <div>
          <span className="font-medium text-sm">{cat.name}</span>
          {cat.isDefault && (
            <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">за замовч.</span>
          )}
        </div>
      </div>
      <button
        onClick={() => handleDelete(cat.id, cat.name)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Категорії</h1>
          <p className="text-muted-foreground text-sm mt-1">{categories.length} категорій</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Додати
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Нова категорія</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Назва</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Назва категорії" />
            </div>
            <div>
              <Label>Тип</Label>
              <Select value={type} onValueChange={v => setType(v as 'income' | 'expense')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Дохід</SelectItem>
                  <SelectItem value="expense">Витрата</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAdd} className="w-full" disabled={loading}>
              {loading ? 'Збереження...' : 'Створити'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Доходи ({incomeCategories.length})
          </h3>
          {incomeCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">Немає категорій доходів</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {incomeCategories.map(renderCategory)}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Витрати ({expenseCategories.length})
          </h3>
          {expenseCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">Немає категорій витрат</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {expenseCategories.map(renderCategory)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
