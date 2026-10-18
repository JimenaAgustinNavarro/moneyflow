import type { ReactNode } from 'react';

import { AuthProvider } from '@/providers/AuthProvider';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </AuthProvider>
  );
}
