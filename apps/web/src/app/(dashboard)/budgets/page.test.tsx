import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const budgetHooks = vi.hoisted(() => ({
  useBudgets: vi.fn(), useCreateBudget: vi.fn(), useUpdateBudget: vi.fn(),
  useDeleteBudget: vi.fn(), useRestoreBudget: vi.fn(), useCopyBudget: vi.fn(),
}));
vi.mock('@/hooks/useBudgets', () => budgetHooks);
vi.mock('@/hooks/useCategories', () => ({ useCategories: () => ({ data: [], isLoading: false }) }));
vi.mock('@/components/budgets/BudgetFilters', () => ({ BudgetFilters: () => <div>Filtros de presupuestos</div> }));
vi.mock('@/components/budgets/BudgetFormModal', () => ({ BudgetFormModal: ({ open }: { open: boolean }) => open ? <div>Modal crear presupuesto</div> : null }));
vi.mock('@/components/budgets/CopyBudgetModal', () => ({ CopyBudgetModal: ({ budget }: { budget: unknown }) => budget ? <div>Modal duplicar presupuesto</div> : null }));
vi.mock('@/components/budgets/BudgetGrid', () => ({ BudgetGrid: ({ budgets, onCopy }: { budgets: { name: string }[]; onCopy: (value: unknown) => void }) => <div>{budgets.length ? budgets.map((budget) => <button key={budget.name} onClick={() => onCopy(budget)}>{budget.name}</button>) : 'Lista vacía'}</div> }));

import BudgetsPage from './page';

const mutation = () => ({ mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false });

describe('BudgetsPage', () => {
  beforeEach(() => {
    budgetHooks.useCreateBudget.mockReturnValue(mutation());
    budgetHooks.useUpdateBudget.mockReturnValue(mutation());
    budgetHooks.useDeleteBudget.mockReturnValue(mutation());
    budgetHooks.useRestoreBudget.mockReturnValue(mutation());
    budgetHooks.useCopyBudget.mockReturnValue(mutation());
  });

  it('renderiza header y abre el modal de creación', async () => {
    budgetHooks.useBudgets.mockReturnValue({ data: [], isLoading: false, error: null });
    render(<BudgetsPage />);
    expect(screen.getByRole('heading', { name: 'Presupuestos' })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Nuevo presupuesto' }));
    expect(screen.getByText('Modal crear presupuesto')).toBeInTheDocument();
  });

  it('muestra carga, error y vacío', () => {
    budgetHooks.useBudgets.mockReturnValue({ data: undefined, isLoading: true, error: null });
    const { rerender } = render(<BudgetsPage />);
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
    budgetHooks.useBudgets.mockReturnValue({ data: undefined, isLoading: false, error: new Error('Error de presupuestos') });
    rerender(<BudgetsPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('Error de presupuestos');
    budgetHooks.useBudgets.mockReturnValue({ data: [], isLoading: false, error: null });
    rerender(<BudgetsPage />);
    expect(screen.getByText('Lista vacía')).toBeInTheDocument();
  });

  it('lista presupuestos y abre el modal de copia', async () => {
    budgetHooks.useBudgets.mockReturnValue({ data: [{ name: 'Hogar' }], isLoading: false, error: null });
    render(<BudgetsPage />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Hogar' }));
    expect(screen.getByText('Modal duplicar presupuesto')).toBeInTheDocument();
  });
});
