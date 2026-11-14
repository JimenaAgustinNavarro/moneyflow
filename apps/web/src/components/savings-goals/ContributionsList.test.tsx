import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GoalContribution, SavingsGoal } from '@/types/savings-goal';

const contributionHooks = vi.hoisted(() => ({
  useContributions: vi.fn(),
  useDeleteContribution: vi.fn(),
  useRestoreContribution: vi.fn(),
}));
vi.mock('@/hooks/useSavingsGoals', () => contributionHooks);

import { ContributionsList } from './ContributionsList';

const goal: SavingsGoal = {
  id: 'goal-1',
  userId: 'user-1',
  name: 'Viaje',
  targetAmount: '1000.00',
  currentAmount: '500.00',
  percentage: 50,
  targetDate: null,
  accountId: null,
  status: 'ACTIVE',
  contributions: [],
  createdAt: '',
  updatedAt: '',
  deletedAt: null,
};

const contribution: GoalContribution = {
  id: 'contribution-1',
  goalId: goal.id,
  transactionId: null,
  amount: '50.00',
  type: 'DEPOSIT',
  date: '2026-11-13T00:00:00.000Z',
  createdAt: '2026-11-13T00:00:00.000Z',
  deletedAt: null,
};

function renderList() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return render(
    <ContributionsList open onClose={vi.fn()} goal={goal} />,
    { wrapper: Wrapper },
  );
}

describe('ContributionsList', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('muestra aportes con fecha, tipo y monto', () => {
    contributionHooks.useContributions.mockReturnValue({
      data: [contribution],
      isPending: false,
      isError: false,
    });
    contributionHooks.useDeleteContribution.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    });
    contributionHooks.useRestoreContribution.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    });
    renderList();
    expect(screen.getByText('Depósito')).toBeInTheDocument();
    expect(screen.getByText(/50/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Eliminar aporte' })).toBeInTheDocument();
  });

  it('al eliminar muestra Deshacer y llama la mutación', async () => {
    contributionHooks.useContributions.mockReturnValue({
      data: [contribution],
      isPending: false,
      isError: false,
    });
    const mutateAsync = vi.fn().mockResolvedValue(undefined);
    contributionHooks.useDeleteContribution.mockReturnValue({ mutateAsync, isPending: false });
    contributionHooks.useRestoreContribution.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    });
    renderList();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar aporte' }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(contribution.id));
    expect(await screen.findByText('Aporte eliminado.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deshacer' })).toBeInTheDocument();
  });

  it('Deshacer restaura el aporte', async () => {
    contributionHooks.useContributions.mockReturnValue({
      data: [contribution],
      isPending: false,
      isError: false,
    });
    contributionHooks.useDeleteContribution.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    });
    const restore = vi.fn().mockResolvedValue(undefined);
    contributionHooks.useRestoreContribution.mockReturnValue({
      mutateAsync: restore,
      isPending: false,
    });
    renderList();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar aporte' }));
    await screen.findByText('Aporte eliminado.');
    fireEvent.click(screen.getByRole('button', { name: 'Deshacer' }));
    await waitFor(() => expect(restore).toHaveBeenCalledWith(contribution.id));
  });

  it('oculta el aviso después de cinco segundos', async () => {
    vi.useFakeTimers();
    contributionHooks.useContributions.mockReturnValue({
      data: [contribution],
      isPending: false,
      isError: false,
    });
    contributionHooks.useDeleteContribution.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    });
    contributionHooks.useRestoreContribution.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    });
    renderList();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Eliminar aporte' }));
      await Promise.resolve();
    });
    expect(screen.getByText('Aporte eliminado.')).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByText('Aporte eliminado.')).not.toBeInTheDocument();
  });
});
