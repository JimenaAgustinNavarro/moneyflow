'use client';

import { useState } from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { CashFlowChart } from '@/components/dashboard/CashFlowChart';
import { CategoryChart } from '@/components/dashboard/CategoryChart';
import { PeriodSelector } from '@/components/dashboard/PeriodSelector';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { useDashboardSummary } from '@/hooks/useDashboardSummary';
import type { DashboardFilters } from '@/types/dashboard';

export default function DashboardPage() {
  const [filters, setFilters] = useState<DashboardFilters>({ period: 'month' });
  const query = useDashboardSummary(filters);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Resumen de tus finanzas.</p>
        </div>
        <nav aria-label="Enlaces rápidos" className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/transactions">Ver movimientos</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/categories">Ver categorías</Link>
          </Button>
          <Button asChild>
            <Link href="/accounts">Ver cuentas</Link>
          </Button>
        </nav>
      </header>

      <PeriodSelector filters={filters} onChange={setFilters} />

      {query.error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {query.error instanceof Error ? query.error.message : 'No se pudo cargar el dashboard.'}
        </p>
      )}

      <SummaryCards summary={query.data} isLoading={query.isLoading} />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* FIX-DASHBOARD-05: el endpoint todavía no expone una serie temporal. */}
        <CashFlowChart data={[]} isLoading={query.isLoading} />
        <CategoryChart data={query.data?.topCategories ?? []} isLoading={query.isLoading} />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Movimientos recientes</h2>
        <RecentTransactions
          transactions={query.data?.recentTransactions ?? []}
          isLoading={query.isLoading}
        />
      </section>
    </div>
  );
}
