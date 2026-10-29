'use client';

import { ArrowLeftRight, FolderTree, Plus, Wallet } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

const ACTIONS = [
  { href: '/transactions', label: 'Nuevo movimiento', Icon: Plus },
  { href: '/transactions', label: 'Nueva transferencia', Icon: ArrowLeftRight },
  { href: '/accounts', label: 'Cuentas', Icon: Wallet },
  { href: '/categories', label: 'Categorías', Icon: FolderTree },
];

export function QuickActions() {
  return (
    <nav aria-label="Accesos rápidos" className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {ACTIONS.map(({ href, label, Icon }) => (
        <Button key={label} variant="outline" asChild className="justify-start">
          <Link href={href}>
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </Link>
        </Button>
      ))}
    </nav>
  );
}
