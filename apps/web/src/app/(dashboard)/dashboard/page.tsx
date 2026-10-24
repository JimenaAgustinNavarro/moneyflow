'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Animated } from '@/components/ui/motion';
import { authenticatedRequest } from '@/lib/api-client';

type AuthenticatedUserResponse = {
  id: string;
  email: string;
  name: string;
  timezone: string;
  createdAt: string;
};

export default function DashboardPage() {
  const [name, setName] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    authenticatedRequest<AuthenticatedUserResponse>('/auth/me')
      .then((user) => {
        if (isMounted) {
          setName(user.name);
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setLoadError(error instanceof Error ? error.message : 'No se pudo cargar tu perfil.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const overviewCards = [
    { title: 'Saldo total', value: 'S/ 0.00', tone: 'text-primary' },
    { title: 'Ingresos del mes', value: 'S/ 0.00', tone: 'text-emerald-500' },
    { title: 'Egresos del mes', value: 'S/ 0.00', tone: 'text-rose-500' },
  ];

  return (
    <div className="space-y-6">
      <Animated variant="fadeIn" className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Bienvenido{name ? `, ${name}` : ''}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Este es tu resumen financiero.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/transactions">Ver movimientos</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/categories">Ver categorías</Link>
          </Button>
          <Button
            asChild
            className="shadow-md shadow-primary/15 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/20"
          >
            <Link href="/accounts">Ver cuentas</Link>
          </Button>
        </div>
      </Animated>

      {loadError && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {loadError}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {overviewCards.map(({ title, value, tone }, index) => (
          <Animated key={title} variant="staggerItem" delay={index * 0.08}>
            <Card className="moneyflow-card-hover border border-border/80 bg-card/80 shadow-sm hover:border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold tracking-tight ${tone}`}>{value}</p>
                <p className="mt-2 text-xs text-muted-foreground">Próximamente</p>
              </CardContent>
            </Card>
          </Animated>
        ))}
      </div>
    </div>
  );
}
