import type { ReactNode } from 'react';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { Header } from '@/components/dashboard/Header';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { AuthProvider } from '@/providers/AuthProvider';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AuthGuard>
        <div className="flex min-h-screen bg-background">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Header />
            <main className="flex-1 overflow-y-auto p-6">{children}</main>
          </div>
        </div>
      </AuthGuard>
    </AuthProvider>
  );
}
