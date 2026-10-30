'use client';

import {
  ArrowLeftRight,
  LayoutDashboard,
  PiggyBank,
  Repeat2,
  Settings,
  Tag,
  Target,
  Wallet,
} from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigationItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, enabled: true },
  { href: '/accounts', label: 'Cuentas', icon: Wallet, enabled: true },
  { href: '/categories', label: 'Categorías', icon: Tag, enabled: true },
  { href: '/transactions', label: 'Movimientos', icon: ArrowLeftRight, enabled: true },
  { href: '/recurrences', label: 'Recurrencias', icon: Repeat2, enabled: true },
  { href: '/budgets', label: 'Presupuestos', icon: PiggyBank, enabled: false },
  { href: '/savings-goals', label: 'Metas', icon: Target, enabled: false },
  { href: '/settings', label: 'Configuración', icon: Settings, enabled: false },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-16 shrink-0 flex-col border-r border-border/80 bg-card/90 backdrop-blur-sm md:w-64">
      <div className="flex h-16 items-center border-b border-border/80 px-6">
        <span className="text-lg font-semibold tracking-tight text-primary">MoneyFlow</span>
      </div>
      <nav aria-label="Navegación principal" className="flex-1 space-y-1 p-4">
        {navigationItems.map(({ href, label, icon: Icon, enabled }) => {
          const isActive = pathname === href;

          if (!enabled) {
            return (
              <span
                key={href}
                aria-disabled="true"
                aria-label={label}
                title="Próximamente"
                className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground opacity-50"
              >
                <Icon aria-hidden="true" size={18} className="opacity-80" />
                <span className="hidden md:inline">{label}</span>
              </span>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              aria-label={label}
              title={label}
              className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground transition-all duration-200 hover:translate-x-0.5 hover:bg-accent/80"
            >
              {isActive && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl bg-primary/10 ring-1 ring-primary/10"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <Icon
                aria-hidden="true"
                size={18}
                className="relative z-10 transition-transform duration-200 group-hover:scale-110"
              />
              <span className="relative z-10 hidden font-medium md:inline">{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
