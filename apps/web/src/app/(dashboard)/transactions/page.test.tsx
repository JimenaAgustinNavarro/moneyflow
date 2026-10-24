import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const hooks = vi.hoisted(() => ({
  useAccounts: vi.fn(),
  useCategories: vi.fn(),
  useTransactions: vi.fn(),
  useCreateTransaction: vi.fn(),
  useUpdateTransaction: vi.fn(),
  useDeleteTransaction: vi.fn(),
}));

vi.mock('@/hooks/useAccounts', () => ({ useAccounts: hooks.useAccounts }));
vi.mock('@/hooks/useCategories', () => ({ useCategories: hooks.useCategories }));
vi.mock('@/hooks/useTransactions', () => ({
  useTransactions: hooks.useTransactions,
  useCreateTransaction: hooks.useCreateTransaction,
  useUpdateTransaction: hooks.useUpdateTransaction,
  useDeleteTransaction: hooks.useDeleteTransaction,
}));

import TransactionsPage from './page';
import type { Account } from '@/types/account';
import type { Category } from '@/types/category';
import type { Transaction } from '@/types/transaction';

const account: Account = {
  id: 'account-1',
  name: 'Cuenta principal',
  type: 'BANK',
  currency: 'PEN',
  initialBalance: '0.00',
  balance: '100.00',
  archived: false,
  createdAt: '2026-10-23T00:00:00Z',
  updatedAt: '2026-10-23T00:00:00Z',
};

const category: Category = {
  id: 'category-1',
  name: 'Alimentación',
  type: 'EXPENSE',
  parentId: null,
  icon: null,
  color: null,
  isSystem: false,
  createdAt: '2026-10-23T00:00:00Z',
};

const transaction: Transaction = {
  id: 'transaction-1',
  accountId: account.id,
  categoryId: category.id,
  type: 'EXPENSE',
  amount: '15.50',
  currency: 'PEN',
  description: 'Almuerzo',
  date: '2026-10-23T10:00:00.000Z',
  status: 'CONFIRMED',
  transferId: null,
  counterpartAccountId: null,
  obligationId: null,
  createdAt: '2026-10-23T10:00:00.000Z',
  updatedAt: '2026-10-23T10:00:00.000Z',
};

function renderPage() {
  return render(<TransactionsPage />);
}

async function selectOption(trigger: HTMLElement, name: string) {
  fireEvent.keyDown(trigger, { key: 'ArrowDown', code: 'ArrowDown' });
  fireEvent.click(await screen.findByRole('option', { name }));
}

describe('TransactionsPage', () => {
  beforeEach(() => {
    hooks.useAccounts.mockReset().mockReturnValue({ data: [account], isError: false });
    hooks.useCategories.mockReset().mockReturnValue({ data: [category], isError: false });
    hooks.useTransactions.mockReset().mockReturnValue({
      data: {
        data: [transaction],
        meta: { page: 1, limit: 20, total: 21, totalPages: 2 },
      },
      isPending: false,
      isError: false,
      isSuccess: true,
      isFetching: false,
    });
    hooks.useCreateTransaction
      .mockReset()
      .mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(transaction) });
    hooks.useUpdateTransaction
      .mockReset()
      .mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(transaction) });
    hooks.useDeleteTransaction
      .mockReset()
      .mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false });
  });

  it('muestra el estado de carga', () => {
    hooks.useTransactions.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      isSuccess: false,
      isFetching: true,
    });

    renderPage();

    expect(screen.getByRole('status')).toHaveTextContent('Cargando movimientos...');
  });

  it('muestra el estado vacío y ofrece el alta de movimientos', async () => {
    hooks.useTransactions.mockReturnValue({
      data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isPending: false,
      isError: false,
      isSuccess: true,
      isFetching: false,
    });
    renderPage();

    expect(await screen.findByText('No hay movimientos para mostrar.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo movimiento' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nuevo movimiento' })).toBeInTheDocument();
  });

  it('renderiza los movimientos con nombres de cuenta y categoría', () => {
    renderPage();

    const row = screen.getByRole('row', { name: /Almuerzo/ });
    expect(within(row).getByText('Cuenta principal')).toBeInTheDocument();
    expect(within(row).getByText('Alimentación')).toBeInTheDocument();
  });

  it('avanza de página y reinicia la paginación al cambiar un filtro', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    await waitFor(() =>
      expect(hooks.useTransactions).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2, limit: 20 }),
      ),
    );
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();

    await selectOption(screen.getByRole('combobox', { name: 'Cuenta' }), 'Cuenta principal');
    await waitFor(() =>
      expect(hooks.useTransactions).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, accountId: 'account-1' }),
      ),
    );
  });
});
