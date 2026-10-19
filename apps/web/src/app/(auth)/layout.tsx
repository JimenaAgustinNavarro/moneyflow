import type { ReactNode } from 'react';

import { ThemeToggle } from '@/components/ui/theme-toggle';
import { AuthProvider } from '@/providers/AuthProvider';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-primary/5 via-background to-background p-6">
        <div className="absolute inset-0 moneyflow-gradient-surface" />
        <div className="absolute right-4 top-4 z-10">
          <ThemeToggle />
        </div>
        <main className="relative z-10 w-full max-w-md">{children}</main>
      </div>
    </AuthProvider>
  );
}
