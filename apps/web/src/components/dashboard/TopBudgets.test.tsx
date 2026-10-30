import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { TopBudget } from '@/types/dashboard';
import { TopBudgets } from './TopBudgets';

const budget = (id: string, status: TopBudget['status'], percentage: number): TopBudget => ({
  id,
  name: `Presupuesto ${id}`,
  limit: '500.00',
  currency: 'PEN',
  periodType: 'MONTHLY',
  startDate: '2026-10-01T00:00:00-05:00',
  endDate: null,
  spent: '400.00',
  percentage,
  status,
  alertThreshold: 80,
});

describe('TopBudgets', () => {
  it('renderiza los presupuestos, porcentajes y estados', () => {
    render(<TopBudgets budgets={[budget('1', 'UNDER_LIMIT', 40), budget('2', 'NEAR_LIMIT', 80), budget('3', 'OVER_LIMIT', 120)]} isLoading={false} />);
    expect(screen.getByText('Presupuesto 1')).toBeInTheDocument();
    expect(screen.getByText('40.0%')).toBeInTheDocument();
    expect(screen.getByText('80.0%')).toBeInTheDocument();
    expect(screen.getByText('120.0%')).toBeInTheDocument();
    expect(screen.getByText('Bajo control')).toBeInTheDocument();
    expect(screen.getByText('Cerca del límite')).toBeInTheDocument();
    expect(screen.getByText('Excedido')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver todos' })).toHaveAttribute('href', '/budgets');
  });

  it('aplica los colores de cada estado a las barras', () => {
    const { container } = render(<TopBudgets budgets={[budget('1', 'UNDER_LIMIT', 40), budget('2', 'NEAR_LIMIT', 80), budget('3', 'OVER_LIMIT', 120)]} isLoading={false} />);
    expect(container.querySelector('.bg-emerald-500')).toBeInTheDocument();
    expect(container.querySelector('.bg-yellow-500')).toBeInTheDocument();
    expect(container.querySelector('.bg-rose-500')).toBeInTheDocument();
  });

  it('limita la lista a tres y muestra estados de carga y vacío', () => {
    const { rerender } = render(<TopBudgets budgets={Array.from({ length: 5 }, (_, index) => budget(String(index + 1), 'UNDER_LIMIT', 40))} isLoading={false} />);
    expect(screen.queryByText('Presupuesto 4')).not.toBeInTheDocument();
    rerender(<TopBudgets budgets={[]} isLoading />);
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
    rerender(<TopBudgets budgets={[]} isLoading={false} />);
    expect(screen.getByText(/Sin presupuestos activos/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Crear uno' })).toHaveAttribute('href', '/budgets');
  });
});
