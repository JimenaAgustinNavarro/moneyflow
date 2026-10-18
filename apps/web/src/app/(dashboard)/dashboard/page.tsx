'use client';

import { useEffect, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">
          Bienvenido{name ? `, ${name}` : ''}
        </h2>
        <p className="text-sm text-muted-foreground">Este es tu resumen financiero.</p>
      </div>

      {loadError && (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {loadError}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { title: 'Saldo total', value: 'S/ 0.00' },
          { title: 'Ingresos del mes', value: 'S/ 0.00' },
          { title: 'Egresos del mes', value: 'S/ 0.00' },
        ].map(({ title, value }) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">Próximamente</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
