import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SavingsGoal } from '@/types/savings-goal';
import { SavingsGoalCard } from './SavingsGoalCard';

const baseGoal: SavingsGoal = {
  id: 'goal-1',
  userId: 'user-1',
  name: 'Viaje',
  targetAmount: '1000.00',
  currentAmount: '500.00',
  percentage: 50,
  targetDate: '2027-01-15',
  accountId: null,
  status: 'ACTIVE',
  contributions: [],
  createdAt: '',
  updatedAt: '',
  deletedAt: null,
};

function renderCard(overrides: Partial<SavingsGoal> = {}) {
  const props = {
    goal: { ...baseGoal, ...overrides },
    onContribute: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onRestore: vi.fn(),
    onViewContributions: vi.fn(),
  };
  return { ...render(<SavingsGoalCard {...props} />), props };
}

describe('SavingsGoalCard', () => {
  it('muestra nombre, montos, porcentaje y fecha objetivo', () => {
    renderCard();
    expect(screen.getByText('Viaje')).toBeInTheDocument();
    expect(screen.getByText(/500/)).toBeInTheDocument();
    expect(screen.getByText(/1,000/)).toBeInTheDocument();
    expect(screen.getByText('50.0%')).toBeInTheDocument();
    expect(screen.getByText(/15\/1\/2027|15\/01\/2027/)).toBeInTheDocument();
  });

  it.each([
    [50, 'bg-emerald-500'],
    [80, 'bg-yellow-500'],
    [100, 'bg-yellow-500'],
    [120, 'bg-rose-500'],
  ])('usa el color correcto para %s%%', (percentage, color) => {
    const { container } = renderCard({ percentage });
    expect(container.querySelector(`.${color}`)).toBeInTheDocument();
  });

  it('ejecuta las acciones de una meta activa', () => {
    const { props } = renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Aportar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ver aportes' }));
    expect(props.onContribute).toHaveBeenCalledWith(props.goal);
    expect(props.onEdit).toHaveBeenCalledWith(props.goal);
    expect(props.onDelete).toHaveBeenCalledWith(props.goal);
    expect(props.onViewContributions).toHaveBeenCalledWith(props.goal);
  });

  it('muestra restauración para una meta eliminada', () => {
    const { props } = renderCard({ deletedAt: '2026-11-01T00:00:00.000Z' });
    fireEvent.click(screen.getByRole('button', { name: 'Restaurar' }));
    expect(props.onRestore).toHaveBeenCalledWith(props.goal);
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
  });

  it('muestra el estado completado y permite abrir el modal de aportes', () => {
    renderCard({ status: 'COMPLETED', percentage: 100 });
    expect(screen.getByText('Completada')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aportar' })).toBeEnabled();
  });
});
