import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SavingsGoal, SavingsGoalFilters } from '@/types/savings-goal';

const goalHooks = vi.hoisted(() => ({
  useSavingsGoals: vi.fn(),
  useCreateSavingsGoal: vi.fn(),
  useUpdateSavingsGoal: vi.fn(),
  useDeleteSavingsGoal: vi.fn(),
  useRestoreSavingsGoal: vi.fn(),
  useCreateContribution: vi.fn(),
}));
vi.mock('@/hooks/useSavingsGoals', () => goalHooks);
vi.mock('@/components/savings-goals/SavingsGoalFilters', () => ({
  SavingsGoalFilters: ({
    onChange,
  }: {
    onChange: (filters: SavingsGoalFilters) => void;
  }) => (
    <button
      type="button"
      onClick={() => onChange({ status: 'COMPLETED', page: 1, limit: 20 })}
    >
      Filtrar completadas
    </button>
  ),
}));
vi.mock('@/components/savings-goals/SavingsGoalFormModal', () => ({
  SavingsGoalFormModal: ({ open, editing }: { open: boolean; editing: SavingsGoal | null }) =>
    open ? <div>{editing ? 'Modal editar meta' : 'Modal crear meta'}</div> : null,
}));
vi.mock('@/components/savings-goals/GoalContributionModal', () => ({
  GoalContributionModal: ({ open }: { open: boolean }) =>
    open ? <div>Modal aporte</div> : null,
}));
vi.mock('@/components/savings-goals/ContributionsList', () => ({
  ContributionsList: ({ open }: { open: boolean }) =>
    open ? <div>Modal historial de aportes</div> : null,
}));
vi.mock('@/components/ui/confirmation-modal', () => ({
  ConfirmationModal: ({ open }: { open: boolean }) =>
    open ? <div>Confirmar eliminación</div> : null,
}));

import SavingsGoalsPage from './page';

const goal: SavingsGoal = {
  id: 'goal-1',
  userId: 'user-1',
  name: 'Viaje',
  targetAmount: '1000.00',
  currentAmount: '250.00',
  percentage: 25,
  targetDate: null,
  accountId: null,
  status: 'ACTIVE',
  contributions: [],
  createdAt: '',
  updatedAt: '',
  deletedAt: null,
};

const mutation = () => ({ mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false });

describe('SavingsGoalsPage', () => {
  beforeEach(() => {
    goalHooks.useCreateSavingsGoal.mockReturnValue(mutation());
    goalHooks.useUpdateSavingsGoal.mockReturnValue(mutation());
    goalHooks.useDeleteSavingsGoal.mockReturnValue(mutation());
    goalHooks.useRestoreSavingsGoal.mockReturnValue(mutation());
    goalHooks.useCreateContribution.mockReturnValue(mutation());
  });

  it('muestra carga y error', () => {
    goalHooks.useSavingsGoals.mockReturnValue({
      isPending: true,
      isError: false,
      isFetching: false,
      data: undefined,
    });
    const { rerender } = render(<SavingsGoalsPage />);
    expect(screen.getByText('Cargando metas...')).toBeInTheDocument();

    goalHooks.useSavingsGoals.mockReturnValue({
      isPending: false,
      isError: true,
      isFetching: false,
      error: new Error('Error al cargar metas'),
      data: undefined,
    });
    rerender(<SavingsGoalsPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('Error al cargar metas');
  });

  it('muestra el estado vacío y permite iniciar la creación', async () => {
    goalHooks.useSavingsGoals.mockReturnValue({
      isPending: false,
      isError: false,
      isFetching: false,
      data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
    });
    render(<SavingsGoalsPage />);
    expect(screen.getByText('No hay metas de ahorro. Crea la primera.')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Nueva meta' }));
    expect(screen.getByText('Modal crear meta')).toBeInTheDocument();
  });

  it('muestra la meta, pagina y abre los modales de aporte e historial', async () => {
    goalHooks.useSavingsGoals.mockImplementation((filters: SavingsGoalFilters) => ({
      isPending: false,
      isError: false,
      isFetching: false,
      data: {
        data: [goal],
        meta: {
          page: filters.page ?? 1,
          limit: 20,
          total: 21,
          totalPages: 2,
        },
      },
    }));
    render(<SavingsGoalsPage />);
    expect(screen.getByText('Viaje')).toBeInTheDocument();
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Aportar' }));
    expect(screen.getByText('Modal aporte')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver aportes' }));
    expect(screen.getByText('Modal historial de aportes')).toBeInTheDocument();
  });

  it('refina el estado mostrado con el estado efectivo serializado', async () => {
    goalHooks.useSavingsGoals.mockReturnValue({
      isPending: false,
      isError: false,
      isFetching: false,
      data: {
        data: [
          goal,
          { ...goal, id: 'goal-2', name: 'Auto', status: 'COMPLETED' },
        ],
        meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
      },
    });
    render(<SavingsGoalsPage />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Filtrar completadas' }));
    expect(screen.getByText('Auto')).toBeInTheDocument();
    expect(screen.queryByText('Viaje')).not.toBeInTheDocument();
  });
});
