import { useFinance } from '@/store/finance-context';
import { formatMoney } from '@/lib/format';
import { CURRENCIES, ACCOUNT_TYPE_LABELS, AccountType, Currency } from '@/types/finance';
import { CreditCard, Banknote, Landmark, Plus, Trash2, Pencil } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const iconMap: Record<string, React.ElementType> = { CreditCard, Banknote, Landmark };
const typeIcons: Record<AccountType, string> = { card: 'CreditCard', cash: 'Banknote', deposit: 'Landmark' };
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316'];

const defaultForm = { name: '', type: 'card' as AccountType, currency: 'UAH' as Currency, balance: '' };

export default function AccountsPage() {
  const { accounts, addAccount, updateAccount, deleteAccount } = useFinance();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);

  const openCreate = () => { setEditId(null); setForm(defaultForm); setOpen(true); };
  const openEdit = (acc: (typeof accounts)[0]) => {
    setEditId(acc.id);
    setForm({ name: acc.name, type: acc.type, currency: acc.currency, balance: String(acc.balance) });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      if (editId) {
        const existing = accounts.find(a => a.id === editId)!;
        await updateAccount({ ...existing, name: form.name.trim(), type: form.type, currency: form.currency, balance: parseFloat(form.balance) || 0 });
        toast.success('Рахунок оновлено');
      } else {
        await addAccount({
          name: form.name.trim(),
          type: form.type,
          currency: form.currency,
          balance: parseFloat(form.balance) || 0,
          color: COLORS[accounts.length % COLORS.length],
          icon: typeIcons[form.type],
        });
        toast.success('Рахунок створено');
      }
      setOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Видалити рахунок "${name}"? Всі транзакції буде також видалено.`)) return;
    try {
      await deleteAccount(id);
      toast.success('Рахунок видалено');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Рахунки</h1>
          <p className="text-muted-foreground text-sm mt-1">{accounts.length} рахунків</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Додати
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Редагувати рахунок' : 'Новий рахунок'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Назва</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Назва рахунку" />
            </div>
            <div>
              <Label>Тип</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as AccountType, icon: typeIcons[v as AccountType] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ACCOUNT_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Валюта</Label>
              <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v as Currency }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CURRENCIES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.symbol} {v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{editId ? 'Поточний баланс' : 'Початковий баланс'}</Label>
              <Input type="number" value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} placeholder="0" />
            </div>
            <Button onClick={handleSubmit} className="w-full" disabled={loading}>
              {loading ? 'Збереження...' : editId ? 'Зберегти' : 'Створити'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {accounts.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <CreditCard className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">Ще немає рахунків</p>
          <p className="text-muted-foreground text-sm mt-1">Додайте перший рахунок, щоб почати</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(acc => {
            const Icon = iconMap[acc.icon] || CreditCard;
            return (
              <div key={acc.id} className="stat-card group">
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: acc.color + '20' }}>
                    <Icon className="h-5 w-5" style={{ color: acc.color }} />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(acc)} className="text-muted-foreground hover:text-foreground p-1">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(acc.id, acc.name)} className="text-muted-foreground hover:text-destructive p-1">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{acc.name}</p>
                <p className="text-xl font-bold font-mono mt-1">{formatMoney(acc.balance, acc.currency)}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {ACCOUNT_TYPE_LABELS[acc.type]}
                  </span>
                  <span className="text-xs text-muted-foreground">{acc.currency}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
