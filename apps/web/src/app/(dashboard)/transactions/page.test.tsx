import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const hooks = vi.hoisted(() => ({
  useAccounts: vi.fn(),
  useCategories: vi.fn(),
  useTransactions: vi.fn(),
  useCreateTransaction: vi.fn(),
  useUpdateTransaction: vi.fn(),
  useDeleteTransaction: vi.fn(),
  useCreateTransfer: vi.fn(),
  useUpdateTransfer: vi.fn(),
  useDeleteTransfer: vi.fn(),
  useTransfers: vi.fn(),
}));

vi.mock('@/hooks/useAccounts', () => ({ useAccounts: hooks.useAccounts }));
vi.mock('@/hooks/useCategories', () => ({ useCategories: hooks.useCategories }));
vi.mock('@/hooks/useTransactions', () => ({
  useTransactions: hooks.useTransactions,
  useCreateTransaction: hooks.useCreateTransaction,
  useUpdateTransaction: hooks.useUpdateTransaction,
  useDeleteTransaction: hooks.useDeleteTransaction,
}));
vi.mock('@/hooks/useTransfers', () => ({
  useCreateTransfer: hooks.useCreateTransfer,
  useUpdateTransfer: hooks.useUpdateTransfer,
  useDeleteTransfer: hooks.useDeleteTransfer,
  useTransfers: hooks.useTransfers,
}));

import TransactionsPage from './page';
import type { Account } from '@/types/account';
import type { Category } from '@/types/category';
import type { Transaction } from '@/types/transaction';
import type { Transfer } from '@/types/transfer';

const account: Account = {
  id: 'account-1',
  name: 'Cuenta principal',
  type: 'BANK',
  currency: 'PEN',
  initialBalance: '0.00',
  balance: '100.00',
  archived: false,
  deletedAt: null,
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
  createdAt: '2026-10-23T10:00:00.000Z',
  updatedAt: '2026-10-23T10:00:00.000Z',
};

const transfer: Transfer = {
  id: 'transfer-1',
  originAccountId: 'account-1',
  destinationAccountId: 'account-2',
  amount: '50.00',
  currency: 'PEN',
  description: 'Ahorro',
  occurredAt: '2026-10-23T10:00:00.000Z',
  status: 'CONFIRMED',
  cancelledAt: null,
  createdAt: '2026-10-23T10:00:00.000Z',
  updatedAt: '2026-10-23T10:00:00.000Z',
};

function renderPage() {
  return render(<TransactionsPage />);
}

describe('TransactionsPage', () => {
  beforeEach(() => {
    hooks.useAccounts.mockReset().mockReturnValue({ data: [account], isError: false });
    hooks.useCategories.mockReset().mockReturnValue({ data: [category], isError: false });
    hooks.useTransactions.mockReset().mockReturnValue({
      data: {
        data: [transaction],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
      isPending: false,
      isError: false,
      isSuccess: true,
      isFetching: false,
    });
    hooks.useTransfers.mockReset().mockReturnValue({
      data: {
        data: [transfer],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
      isPending: false,
      isError: false,
      isSuccess: true,
      isFetching: false,
    });
    hooks.useCreateTransaction.mockReset().mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(transaction),
    });
    hooks.useUpdateTransaction.mockReset().mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(transaction),
    });
    hooks.useDeleteTransaction.mockReset().mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    });
    hooks.useCreateTransfer.mockReset().mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ data: transfer }),
    });
    hooks.useUpdateTransfer.mockReset().mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ data: transfer }),
    });
    hooks.useDeleteTransfer.mockReset().mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue(undefined),
      isPending: false,
    });
  });

  it('muestra secciones separadas de movimientos y transferencias', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Movimientos', level: 2 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Transferencias' })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Almuerzo/ })).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(4);
  });

  it('ofrece el alta de movimientos y transferencias', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo movimiento' }));
    expect(await screen.findByRole('heading', { name: 'Nuevo movimiento' })).toBeInTheDocument();
  });

  it('abre el modal para crear una transferencia', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Nueva transferencia' }));
    expect(await screen.findByRole('heading', { name: 'Nueva transferencia' })).toBeInTheDocument();
  });

  it('confirma la cancelación de una transferencia sin afectar el borrado de movimientos', async () => {
    const transferDelete = vi.fn().mockResolvedValue(undefined);
    const transactionDelete = vi.fn().mockResolvedValue(undefined);
    hooks.useDeleteTransfer.mockReturnValue({ mutateAsync: transferDelete, isPending: false });
    hooks.useDeleteTransaction.mockReturnValue({
      mutateAsync: transactionDelete,
      isPending: false,
    });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar transferencia' }));
    const dialog = await screen.findByRole('dialog', { name: 'Cancelar transferencia' });
    expect(dialog).toHaveTextContent('Se revertirán los saldos derivados');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar transferencia' }));

    await waitFor(() => expect(transferDelete).toHaveBeenCalledWith('transfer-1'));
    expect(transactionDelete).not.toHaveBeenCalled();
  });

  it('muestra la carga del listado de movimientos', () => {
    hooks.useTransactions.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      isSuccess: false,
      isFetching: true,
    });
    renderPage();
    expect(screen.getByText('Cargando movimientos...')).toBeInTheDocument();
  });
});
