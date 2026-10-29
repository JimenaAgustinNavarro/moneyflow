import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { RecentTransaction } from '@/types/dashboard';

import { RecentTransactions } from './RecentTransactions';

const transactions: RecentTransaction[] = [
  {
    id: 'income-1',
    type: 'INCOME',
    amount: '300.00',
    currency: 'PEN',
    date: '2026-10-28T12:30:00.000-05:00',
    description: 'Sueldo',
    categoryId: 'category-1',
    categoryName: 'Trabajo',
  },
  {
    id: 'expense-1',
    type: 'EXPENSE',
    amount: '45.00',
    currency: 'PEN',
    date: '2026-10-27T12:30:00.000-05:00',
    description: 'Almuerzo',
    categoryId: 'category-2',
    categoryName: 'Alimentación',
  },
  {
    id: 'expense-2',
    type: 'EXPENSE',
    amount: '12.00',
    currency: 'PEN',
    date: '2026-10-26T12:30:00.000-05:00',
    description: null,
    categoryId: null,
    categoryName: null,
  },
];

describe('RecentTransactions', () => {
  it('renderiza una tabla con tres movimientos', () => {
    render(<RecentTransactions transactions={transactions} isLoading={false} />);

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(4);
    expect(screen.getByText('Sueldo')).toBeInTheDocument();
    expect(screen.getByText('Almuerzo')).toBeInTheDocument();
  });

  it('colorea los badges de ingreso y egreso', () => {
    render(<RecentTransactions transactions={transactions} isLoading={false} />);

    expect(screen.getByText('Ingreso')).toHaveClass('bg-emerald-100');
    expect(screen.getAllByText('Egreso')[0]).toHaveClass('bg-rose-100');
  });

  it('muestra las categorías o el texto alternativo cuando faltan', () => {
    render(<RecentTransactions transactions={transactions} isLoading={false} />);

    expect(screen.getByText('Trabajo')).toBeInTheDocument();
    expect(screen.getByText('Alimentación')).toBeInTheDocument();
    expect(screen.getByText('Sin categoría')).toBeInTheDocument();
  });

  it('muestra un estado vacío cuando no hay movimientos', () => {
    render(<RecentTransactions transactions={[]} isLoading={false} />);

    expect(screen.getByText('No hay movimientos recientes.')).toBeInTheDocument();
  });

  it('muestra el estado de carga', () => {
    render(<RecentTransactions transactions={[]} isLoading />);

    expect(screen.getByRole('status')).toHaveTextContent('Cargando movimientos...');
  });
});
