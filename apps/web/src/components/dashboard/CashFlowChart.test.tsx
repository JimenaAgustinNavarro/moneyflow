import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  };
});

import { CashFlowChart } from './CashFlowChart';

describe('CashFlowChart', () => {
  it('renderiza el gráfico cuando hay datos', () => {
    render(
      <CashFlowChart
        data={[{ date: '2026-10-01', income: 300, expense: 100 }]}
        isLoading={false}
      />,
    );

    expect(screen.getByText('Flujo de caja')).toBeInTheDocument();
    expect(screen.queryByText('No hay datos para el período seleccionado.')).not.toBeInTheDocument();
  });

  it('muestra el estado vacío sin datos temporales', () => {
    render(<CashFlowChart data={[]} isLoading={false} />);

    expect(screen.getByText('No hay datos para el período seleccionado.')).toBeInTheDocument();
  });
});
