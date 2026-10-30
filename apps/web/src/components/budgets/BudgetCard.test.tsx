import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Budget } from '@/types/budget';

const useBudgetUsage = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useBudgets', () => ({ useBudgetUsage }));

import { BudgetCard } from './BudgetCard';

const budget: Budget = {
  id: 'budget-1', userId: 'user-1', name: 'Hogar', limit: '500.00', currency: 'PEN',
  periodType: 'MONTHLY', startDate: '2026-10-01T00:00:00-05:00', endDate: null,
  alertThreshold: 80, active: true, categories: [{ id: 'category-1', name: 'Servicios', type: 'EXPENSE' }],
  createdAt: '', updatedAt: '', deletedAt: null,
};

function renderCard(overrides: Partial<Budget> = {}) {
  return render(<BudgetCard budget={{ ...budget, ...overrides }} onEdit={vi.fn()} onCopy={vi.fn()} onDelete={vi.fn()} onRestore={vi.fn()} />);
}

describe('BudgetCard', () => {
  it('renderiza nombre, límite y categorías', () => {
    useBudgetUsage.mockReturnValue({ data: undefined });
    renderCard();
    expect(screen.getByText('Hogar')).toBeInTheDocument();
    expect(screen.getByText('Servicios')).toBeInTheDocument();
    expect(screen.getByText(/500/)).toBeInTheDocument();
  });

  it.each([
    ['UNDER_LIMIT', 'bg-emerald-500'],
    ['NEAR_LIMIT', 'bg-yellow-500'],
    ['OVER_LIMIT', 'bg-rose-500'],
  ] as const)('usa el color correspondiente para %s', (status, className) => {
    useBudgetUsage.mockReturnValue({ data: { spent: '400.00', percentage: 80, status, limit: '500.00', alertThreshold: 80, period: { startDate: '', endDate: null } } });
    const { container } = renderCard();
    expect(container.querySelector(`.${className}`)).toBeInTheDocument();
    expect(screen.getByText(/80\.0%/)).toBeInTheDocument();
  });

  it('dispara editar, copiar y eliminar', async () => {
    useBudgetUsage.mockReturnValue({ data: undefined });
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onCopy = vi.fn();
    const onDelete = vi.fn();
    render(<BudgetCard budget={budget} onEdit={onEdit} onCopy={onCopy} onDelete={onDelete} onRestore={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Editar' }));
    await user.click(screen.getByRole('button', { name: 'Duplicar' }));
    await user.click(screen.getByRole('button', { name: 'Eliminar' }));
    expect(onEdit).toHaveBeenCalledWith(budget);
    expect(onCopy).toHaveBeenCalledWith(budget);
    expect(onDelete).toHaveBeenCalledWith(budget);
  });

  it('restauración aparece para presupuestos eliminados', async () => {
    useBudgetUsage.mockReturnValue({ data: undefined });
    const onRestore = vi.fn();
    const deleted = { ...budget, deletedAt: '2026-10-30' };
    render(<BudgetCard budget={deleted} onEdit={vi.fn()} onCopy={vi.fn()} onDelete={vi.fn()} onRestore={onRestore} />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Restaurar' }));
    expect(onRestore).toHaveBeenCalledWith(deleted);
  });
});
