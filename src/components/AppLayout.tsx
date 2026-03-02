import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, CreditCard, ArrowLeftRight, Tag, Target, PiggyBank,
  Menu, X, Settings, LogOut, ChevronDown,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Дашборд' },
  { to: '/accounts', icon: CreditCard, label: 'Рахунки' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Транзакції' },
  { to: '/categories', icon: Tag, label: 'Категорії' },
  { to: '/budgets', icon: PiggyBank, label: 'Бюджети' },
  { to: '/goals', icon: Target, label: 'Цілі' },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
    isActive
      ? 'bg-sidebar-accent text-sidebar-primary'
      : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
  );

function SidebarNav({ onClose }: { onClose?: () => void }) {
  return (
    <nav className="flex-1 px-3 space-y-1">
      {navItems.map(item => (
        <NavLink key={item.to} to={item.to} end={item.to === '/'} className={navLinkClass} onClick={onClose}>
          <item.icon className="h-4 w-4" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors">
          <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 text-left truncate">
            <p className="font-medium text-sidebar-accent-foreground truncate text-xs">{user?.name}</p>
            <p className="text-sidebar-foreground text-xs truncate opacity-70">{user?.email}</p>
          </div>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => navigate('/settings')}>
          <Settings className="h-4 w-4 mr-2" />
          Налаштування
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => { logout(); navigate('/login'); }}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Вийти
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-sidebar border-r border-sidebar-border">
        <div className="p-5 pb-3">
          <h1 className="text-lg font-bold text-sidebar-accent-foreground flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-primary" />
            PFM
          </h1>
        </div>
        <SidebarNav />
        <div className="p-3 border-t border-sidebar-border mt-2">
          <NavLink to="/settings" className={navLinkClass}>
            <Settings className="h-4 w-4" />
            Налаштування
          </NavLink>
        </div>
        <div className="p-3 border-t border-sidebar-border">
          <UserMenu />
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed left-0 top-0 h-full w-60 bg-sidebar border-r border-sidebar-border z-50 flex flex-col">
            <div className="p-5 flex justify-between items-center">
              <h1 className="text-lg font-bold text-sidebar-accent-foreground flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-primary" />
                PFM
              </h1>
              <button onClick={() => setMobileOpen(false)} className="text-sidebar-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarNav onClose={() => setMobileOpen(false)} />
            <div className="p-3 border-t border-sidebar-border">
              <NavLink
                to="/settings"
                className={navLinkClass}
                onClick={() => setMobileOpen(false)}
              >
                <Settings className="h-4 w-4" />
                Налаштування
              </NavLink>
            </div>
            <div className="p-3 border-t border-sidebar-border">
              <UserMenu />
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <header className="lg:hidden sticky top-0 z-40 flex items-center gap-3 px-4 py-3 bg-background/80 backdrop-blur-sm border-b border-border">
          <button onClick={() => setMobileOpen(true)} className="text-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-base font-bold flex items-center gap-2">
            <PiggyBank className="h-4 w-4 text-primary" />
            PFM
          </h1>
        </header>
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
