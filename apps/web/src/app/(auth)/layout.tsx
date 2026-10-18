import type { ReactNode } from 'react';

import { ThemeToggle } from '@/components/ui/theme-toggle';
import { AuthProvider } from '@/providers/AuthProvider';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <div className="relative flex min-h-screen items-center justify-center bg-background p-6">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <main className="w-full max-w-md">{children}</main>
      </div>
    </AuthProvider>
  );
}
