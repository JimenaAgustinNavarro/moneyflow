'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TopCategory } from '@/types/dashboard';

interface CategoryChartProps {
  data: TopCategory[];
  isLoading: boolean;
}

const currencyFormatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN',
});

export function CategoryChart({ data, isLoading }: CategoryChartProps) {
  const chartData = data.map((category) => ({
    name: category.categoryName,
    total: Number(category.total),
  }));

  return (
    <Card className="min-w-0 border-border/60">
      <CardHeader>
        <CardTitle className="text-base">Distribución por categorías</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div
            aria-label="Cargando gráfico de categorías"
            className="h-64 w-full animate-pulse rounded bg-muted"
          />
        ) : chartData.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No hay gastos en el período seleccionado.
          </p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              >
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  width={96}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    color: 'hsl(var(--foreground))',
                  }}
                  formatter={(value) =>
                    currencyFormatter.format(typeof value === 'number' ? value : Number(value))
                  }
                />
                <Bar dataKey="total" name="Total" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
