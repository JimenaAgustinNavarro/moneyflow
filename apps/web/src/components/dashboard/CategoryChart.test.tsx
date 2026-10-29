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

import { CategoryChart } from './CategoryChart';

describe('CategoryChart', () => {
  it('renderiza el gráfico cuando hay categorías', () => {
    render(
      <CategoryChart
        data={[
          {
            categoryId: 'category-1',
            categoryName: 'Alimentación',
            total: '120.00',
            count: 4,
          },
        ]}
        isLoading={false}
      />,
    );

    expect(screen.getByText('Distribución por categorías')).toBeInTheDocument();
    expect(screen.queryByText('No hay gastos en el período seleccionado.')).not.toBeInTheDocument();
  });

  it('muestra el estado vacío sin categorías', () => {
    render(<CategoryChart data={[]} isLoading={false} />);

    expect(screen.getByText('No hay gastos en el período seleccionado.')).toBeInTheDocument();
  });
});
