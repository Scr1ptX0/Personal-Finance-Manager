import { useFinance } from '@/store/finance-context';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { CURRENCIES, Currency, TransactionType, Transaction } from '@/types/finance';
import { Plus, Trash2, Pencil, Download, Search } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const TYPE_LABELS: Record<TransactionType | 'all', string> = {
  all: 'Всі',
  income: 'Доходи',
  expense: 'Витрати',
  transfer: 'Перекази',
};

export default function TransactionsPage() {
  const { transactions, categories, accounts, addTransaction, updateTransaction, deleteTransaction } = useFinance();

  // --- Add dialog state ---
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [catId, setCatId] = useState('');
  const [accId, setAccId] = useState('');
  const [toAccId, setToAccId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [loading, setLoading] = useState(false);

  // --- Edit dialog state ---
  const [editOpen, setEditOpen] = useState(false);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [editType, setEditType] = useState<TransactionType>('expense');
  const [editAmount, setEditAmount] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCatId, setEditCatId] = useState('');
  const [editAccId, setEditAccId] = useState('');
  const [editToAccId, setEditToAccId] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // --- Filter state ---
  const [filter, setFilter] = useState<'all' | TransactionType>('all');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [exporting, setExporting] = useState(false);

  const filteredCats = categories.filter(c =>
    type === 'income' ? c.type === 'income' : c.type === 'expense'
  );
  const editFilteredCats = categories.filter(c =>
    editType === 'income' ? c.type === 'income' : c.type === 'expense'
  );

  // --- Add ---
  const handleAdd = async () => {
    if (!amount || !accId) return;
    const acc = accounts.find(a => a.id === accId);
    setLoading(true);
    try {
      await addTransaction({
        type,
        amount: parseFloat(amount),
        currency: acc?.currency || 'UAH',
        categoryId: catId,
        accountId: accId,
        toAccountId: type === 'transfer' ? toAccId : undefined,
        description: desc.trim(),
        date,
      });
      toast.success('Транзакцію додано');
      setAmount(''); setDesc(''); setCatId(''); setOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // --- Edit ---
  const openEdit = (tx: Transaction) => {
    setEditTx(tx);
    setEditType(tx.type);
    setEditAmount(String(tx.amount));
    setEditDesc(tx.description);
    setEditCatId(tx.categoryId);
    setEditAccId(tx.accountId);
    setEditToAccId(tx.toAccountId || '');
    setEditDate(tx.date);
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editTx || !editAmount || !editAccId) return;
    const acc = accounts.find(a => a.id === editAccId);
    setEditLoading(true);
    try {
      await updateTransaction({
        ...editTx,
        type: editType,
        amount: parseFloat(editAmount),
        currency: acc?.currency || (editTx.currency as Currency),
        categoryId: editCatId,
        accountId: editAccId,
        toAccountId: editType === 'transfer' ? editToAccId : undefined,
        description: editDesc.trim(),
        date: editDate,
      });
      toast.success('Транзакцію оновлено');
      setEditOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setEditLoading(false);
    }
  };

  // --- Delete ---
  const handleDelete = async (id: string) => {
    try {
      await deleteTransaction(id);
      toast.success('Транзакцію видалено');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  // --- Export ---
  const handleExport = async (format: 'csv' | 'json') => {
    setExporting(true);
    try {
      const res = await api.exportTransactions(format);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setExporting(false);
    }
  };

  // --- Filtered list ---
  const filtered = useMemo(() => {
    let list = filter === 'all' ? transactions : transactions.filter(t => t.type === filter);
    if (fromDate) list = list.filter(t => t.date >= fromDate);
    if (toDate)   list = list.filter(t => t.date <= toDate);
    if (catFilter && catFilter !== 'all') list = list.filter(t => t.categoryId === catFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.description.toLowerCase().includes(q) ||
        (t.categoryName || categories.find(c => c.id === t.categoryId)?.name || '').toLowerCase().includes(q) ||
        (t.accountName || accounts.find(a => a.id === t.accountId)?.name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [transactions, filter, fromDate, toDate, catFilter, search, categories, accounts]);

  const txFormBody = (
    isEdit: boolean,
    txType: TransactionType, setTxType: (v: TransactionType) => void,
    txAmount: string, setTxAmount: (v: string) => void,
    txAccId: string, setTxAccId: (v: string) => void,
    txToAccId: string, setTxToAccId: (v: string) => void,
    txCatId: string, setTxCatId: (v: string) => void,
    txDesc: string, setTxDesc: (v: string) => void,
    txDate: string, setTxDate: (v: string) => void,
    txLoading: boolean,
    onSubmit: () => void,
    filteredCategories: typeof categories,
  ) => (
    <div className="space-y-4">
      <div>
        <Label>Тип</Label>
        <Select value={txType} onValueChange={v => { setTxType(v as TransactionType); setTxCatId(''); }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="income">Дохід</SelectItem>
            <SelectItem value="expense">Витрата</SelectItem>
            <SelectItem value="transfer">Переказ</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Сума</Label>
        <Input type="number" value={txAmount} onChange={e => setTxAmount(e.target.value)} placeholder="0.00" min="0" step="0.01" />
      </div>
      <div>
        <Label>Рахунок</Label>
        <Select value={txAccId} onValueChange={setTxAccId}>
          <SelectTrigger><SelectValue placeholder="Оберіть рахунок" /></SelectTrigger>
          <SelectContent>
            {accounts.map(a => (
              <SelectItem key={a.id} value={a.id}>{a.name} ({CURRENCIES[a.currency]?.symbol})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {txType === 'transfer' && (
        <div>
          <Label>На рахунок</Label>
          <Select value={txToAccId} onValueChange={setTxToAccId}>
            <SelectTrigger><SelectValue placeholder="Рахунок призначення" /></SelectTrigger>
            <SelectContent>
              {accounts.filter(a => a.id !== txAccId).map(a => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {txType !== 'transfer' && (
        <div>
          <Label>Категорія</Label>
          <Select value={txCatId} onValueChange={setTxCatId}>
            <SelectTrigger><SelectValue placeholder="Оберіть категорію" /></SelectTrigger>
            <SelectContent>
              {filteredCategories.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div>
        <Label>Опис</Label>
        <Input value={txDesc} onChange={e => setTxDesc(e.target.value)} placeholder="Необов'язково" />
      </div>
      <div>
        <Label>Дата</Label>
        <Input type="date" value={txDate} onChange={e => setTxDate(e.target.value)} />
      </div>
      <Button onClick={onSubmit} className="w-full" disabled={txLoading}>
        {txLoading ? 'Збереження...' : isEdit ? 'Зберегти' : 'Додати'}
      </Button>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Транзакції</h1>
          <p className="text-muted-foreground text-sm mt-1">{transactions.length} записів</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')} disabled={exporting}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('json')} disabled={exporting}>
            <Download className="h-4 w-4 mr-1" /> JSON
          </Button>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Додати
          </Button>
        </div>
      </div>

      {/* Add dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Нова транзакція</DialogTitle></DialogHeader>
          {txFormBody(
            false,
            type, setType,
            amount, setAmount,
            accId, setAccId,
            toAccId, setToAccId,
            catId, setCatId,
            desc, setDesc,
            date, setDate,
            loading,
            handleAdd,
            filteredCats,
          )}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Редагування транзакції</DialogTitle></DialogHeader>
          {txFormBody(
            true,
            editType, setEditType,
            editAmount, setEditAmount,
            editAccId, setEditAccId,
            editToAccId, setEditToAccId,
            editCatId, setEditCatId,
            editDesc, setEditDesc,
            editDate, setEditDate,
            editLoading,
            handleEdit,
            editFilteredCats,
          )}
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <div className="space-y-3">
        {/* Type tabs */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'income', 'expense', 'transfer'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {TYPE_LABELS[f]}
            </button>
          ))}
        </div>

        {/* Search + date range + category */}
        <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Пошук..."
              className="pl-8 h-9 text-sm"
            />
          </div>
          <Input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            className="h-9 text-sm w-auto"
            title="Від дати"
          />
          <Input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            className="h-9 text-sm w-auto"
            title="До дати"
          />
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="h-9 text-sm w-auto min-w-[140px]">
              <SelectValue placeholder="Категорія" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Всі категорії</SelectItem>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(fromDate || toDate || catFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-sm"
              onClick={() => { setFromDate(''); setToDate(''); setCatFilter('all'); }}
            >
              Скинути
            </Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-muted-foreground text-sm">Транзакцій не знайдено</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(tx => {
            const cat = categories.find(c => c.id === tx.categoryId);
            const acc = accounts.find(a => a.id === tx.accountId);
            return (
              <div key={tx.id} className="glass-card p-4 flex items-center justify-between group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    tx.type === 'income' ? 'bg-income/10 text-income' :
                    tx.type === 'expense' ? 'bg-expense/10 text-expense' :
                    'bg-transfer/10 text-transfer'
                  }`}>
                    {tx.type === 'income' ? '↑' : tx.type === 'expense' ? '↓' : '↔'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{tx.description || 'Без опису'}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {cat?.name || tx.categoryName || 'Переказ'} · {acc?.name || tx.accountName || ''} · {tx.date}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <p className={`font-mono font-semibold text-sm ${
                    tx.type === 'income' ? 'text-income' : tx.type === 'expense' ? 'text-expense' : 'text-transfer'
                  }`}>
                    {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}{formatMoney(tx.amount, tx.currency)}
                  </p>
                  <button
                    onClick={() => openEdit(tx)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(tx.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
