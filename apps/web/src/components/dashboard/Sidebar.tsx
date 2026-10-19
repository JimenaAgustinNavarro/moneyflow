'use client';

import {
  ArrowLeftRight,
  LayoutDashboard,
  PiggyBank,
  Settings,
  Tag,
  Target,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigationItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, enabled: true },
  { href: '/accounts', label: 'Cuentas', icon: Wallet, enabled: true },
  { href: '/categories', label: 'Categorías', icon: Tag, enabled: false },
  { href: '/transactions', label: 'Movimientos', icon: ArrowLeftRight, enabled: false },
  { href: '/budgets', label: 'Presupuestos', icon: PiggyBank, enabled: false },
  { href: '/savings-goals', label: 'Metas', icon: Target, enabled: false },
  { href: '/settings', label: 'Configuración', icon: Settings, enabled: false },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center border-b border-border px-6">
        <span className="text-lg font-semibold text-moneyflow-primary">MoneyFlow</span>
      </div>
      <nav aria-label="Navegación principal" className="flex-1 space-y-1 p-4">
        {navigationItems.map(({ href, label, icon: Icon, enabled }) => {
          const isActive = pathname === href;

          if (!enabled) {
            return (
              <span
                key={href}
                aria-disabled="true"
                title="Próximamente"
                className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground opacity-50"
              >
                <Icon aria-hidden="true" size={18} />
                {label}
              </span>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-moneyflow-primary/10 font-medium text-moneyflow-primary'
                  : 'text-foreground hover:bg-accent'
              }`}
            >
              <Icon aria-hidden="true" size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
