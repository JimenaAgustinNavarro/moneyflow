'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';

function getInitials(name: string | undefined): string {
  if (!name) {
    return 'U';
  }

  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toLocaleUpperCase('es');
}

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <h1 className="text-lg font-medium text-slate-900">MoneyFlow</h1>
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-slate-600 sm:inline">{user?.name ?? 'Usuario'}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              aria-label="Abrir menú de usuario"
            >
              <Avatar className="h-9 w-9">
                <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => void logout()}>Cerrar sesión</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
