'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CashFlowPoint {
  date: string;
  income: number;
  expense: number;
}

interface CashFlowChartProps {
  data: CashFlowPoint[];
  isLoading: boolean;
}

export function CashFlowChart({ data, isLoading }: CashFlowChartProps) {
  return (
    <Card className="min-w-0 border-border/60">
      <CardHeader>
        <CardTitle className="text-base">Flujo de caja</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div
            aria-label="Cargando gráfico de flujo de caja"
            className="h-64 w-full animate-pulse rounded bg-muted"
          />
        ) : data.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No hay datos para el período seleccionado.
          </p>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  width={56}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    color: 'hsl(var(--foreground))',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="income"
                  name="Ingresos"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="expense"
                  name="Egresos"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
