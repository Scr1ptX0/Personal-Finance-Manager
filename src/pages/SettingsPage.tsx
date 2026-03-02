import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFinance } from '@/store/finance-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, User, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function SettingsPage() {
  const { user, updateProfile, logout } = useAuth();
  const { accounts, transactions } = useFinance();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSavingProfile(true);
    try {
      await updateProfile(name.trim());
      toast.success('Профіль оновлено');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    setExporting(format);
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
      toast.success(`Експортовано ${transactions.length} транзакцій`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setExporting(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Налаштування</h1>
        <p className="text-muted-foreground text-sm mt-1">Керуйте профілем та даними</p>
      </div>

      {/* Profile */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
          <h2 className="font-semibold">Профіль</h2>
        </div>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Ім'я</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ваше ім'я" />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={user?.email || ''} disabled className="opacity-60" />
          </div>
          <Button type="submit" disabled={savingProfile}>
            {savingProfile ? 'Збереження...' : 'Зберегти'}
          </Button>
        </form>
      </div>

      {/* Stats */}
      <div className="glass-card p-6">
        <h2 className="font-semibold mb-4">Статистика</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'Рахунки', value: accounts.length },
            { label: 'Транзакції', value: transactions.length },
            { label: 'З реєстрації', value: user ? new Date(Date.now()).toLocaleDateString('uk-UA') : '—' },
          ].map(item => (
            <div key={item.label} className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-lg font-bold mt-1">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Export */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Download className="h-4 w-4 text-primary" />
          </div>
          <h2 className="font-semibold">Експорт даних</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Завантажте всі ваші транзакції ({transactions.length} записів)
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => handleExport('csv')}
            disabled={!!exporting || transactions.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            {exporting === 'csv' ? 'Завантаження...' : 'Завантажити CSV'}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport('json')}
            disabled={!!exporting || transactions.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            {exporting === 'json' ? 'Завантаження...' : 'Завантажити JSON'}
          </Button>
        </div>
      </div>

      {/* Danger zone */}
      <div className="glass-card p-6 border-destructive/30">
        <h2 className="font-semibold text-destructive mb-2">Вийти</h2>
        <p className="text-sm text-muted-foreground mb-4">Завершити поточну сесію</p>
        <Button variant="destructive" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          Вийти з акаунту
        </Button>
      </div>
    </div>
  );
}
