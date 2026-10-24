import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TransactionFormModal } from './TransactionFormModal';
import { ApiError } from '@/lib/api-client';
import type { Account } from '@/types/account';
import type { Category } from '@/types/category';
import type { Transaction } from '@/types/transaction';

const accounts: Account[] = [
  {
    id: 'account-1',
    name: 'Cuenta principal',
    type: 'BANK',
    currency: 'PEN',
    initialBalance: '0.00',
    balance: '0.00',
    archived: false,
    createdAt: '2026-10-23T00:00:00Z',
    updatedAt: '2026-10-23T00:00:00Z',
  },
];

const categories: Category[] = [
  {
    id: 'expense-category',
    name: 'Alimentación',
    type: 'EXPENSE',
    parentId: null,
    icon: null,
    color: null,
    isSystem: false,
    createdAt: '2026-10-23T00:00:00Z',
  },
  {
    id: 'income-category',
    name: 'Sueldo',
    type: 'INCOME',
    parentId: null,
    icon: null,
    color: null,
    isSystem: false,
    createdAt: '2026-10-23T00:00:00Z',
  },
];

const existingTransaction: Transaction = {
  id: 'transaction-1',
  accountId: 'account-1',
  categoryId: 'expense-category',
  type: 'EXPENSE',
  amount: '25.00',
  currency: 'PEN',
  description: 'Compra',
  date: '2026-10-23T10:00:00.000Z',
  status: 'PENDING',
  transferId: null,
  counterpartAccountId: null,
  obligationId: null,
  createdAt: '2026-10-23T10:00:00.000Z',
  updatedAt: '2026-10-23T10:00:00.000Z',
};

async function selectOption(trigger: HTMLElement, name: string) {
  fireEvent.keyDown(trigger, { key: 'ArrowDown', code: 'ArrowDown' });
  fireEvent.click(await screen.findByRole('option', { name }));
}

function renderForm({
  editing = null,
  onSubmitCreate = vi.fn().mockResolvedValue(undefined),
  onSubmitEdit = vi.fn().mockResolvedValue(undefined),
}: {
  editing?: Transaction | null;
  onSubmitCreate?: (input: {
    accountId: string;
    categoryId?: string | null;
    type: 'INCOME' | 'EXPENSE';
    amount: string;
    description?: string | null;
    date: string;
  }) => Promise<void>;
  onSubmitEdit?: (input: {
    accountId?: string;
    categoryId?: string | null;
    type?: 'INCOME' | 'EXPENSE';
    amount?: string;
    description?: string | null;
    date?: string;
  }) => Promise<void>;
} = {}) {
  const onClose = vi.fn();
  const result = render(
    <TransactionFormModal
      open
      onClose={onClose}
      onSubmitCreate={onSubmitCreate}
      onSubmitEdit={onSubmitEdit}
      accounts={accounts}
      categories={categories}
      editing={editing}
    />,
  );

  return { ...result, onClose, onSubmitCreate, onSubmitEdit };
}

describe('TransactionFormModal', () => {
  it('muestra los campos y valida cuenta y monto requeridos', async () => {
    renderForm();

    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByRole('combobox', { name: 'Tipo' })).toBeInTheDocument();
    expect(dialog.getByRole('combobox', { name: 'Cuenta' })).toBeInTheDocument();
    expect(dialog.getByRole('combobox', { name: 'Categoría' })).toBeInTheDocument();

    fireEvent.click(dialog.getByRole('button', { name: 'Crear movimiento' }));

    expect(await dialog.findByText('Selecciona una cuenta.')).toBeInTheDocument();
    expect(await dialog.findByText('Ingresa un monto con hasta 2 decimales.')).toBeInTheDocument();
  });

  it('filtra las categorías por tipo y limpia la categoría al cambiarlo', async () => {
    renderForm();
    const dialog = within(screen.getByRole('dialog'));

    await selectOption(dialog.getByRole('combobox', { name: 'Categoría' }), 'Alimentación');
    expect(dialog.getByRole('combobox', { name: 'Categoría' })).toHaveTextContent('Alimentación');

    await selectOption(dialog.getByRole('combobox', { name: 'Tipo' }), 'Ingreso');

    expect(dialog.getByRole('combobox', { name: 'Categoría' })).toHaveTextContent('Sin categoría');
    fireEvent.keyDown(dialog.getByRole('combobox', { name: 'Categoría' }), {
      key: 'ArrowDown',
      code: 'ArrowDown',
    });
    expect(await screen.findByRole('option', { name: 'Sueldo' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Alimentación' })).not.toBeInTheDocument();
  });

  it('crea un movimiento con los valores del formulario', async () => {
    const user = userEvent.setup();
    const onSubmitCreate = vi.fn().mockResolvedValue(undefined);
    const { onClose } = renderForm({ onSubmitCreate });
    const dialog = within(screen.getByRole('dialog'));

    await selectOption(dialog.getByRole('combobox', { name: 'Cuenta' }), 'Cuenta principal');
    await user.type(dialog.getByLabelText('Monto'), '45.90');
    await user.type(dialog.getByLabelText('Descripción (opcional)'), 'Cena');
    await user.click(dialog.getByRole('button', { name: 'Crear movimiento' }));

    await waitFor(() =>
      expect(onSubmitCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: 'account-1',
          categoryId: null,
          type: 'EXPENSE',
          amount: '45.90',
          description: 'Cena',
        }),
      ),
    );
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('deshabilita el tipo en un movimiento confirmado', () => {
    renderForm({
      editing: { ...existingTransaction, status: 'CONFIRMED' },
    });

    const typeSelect = screen.getByRole('combobox', { name: 'Tipo' });
    expect(typeSelect).toBeDisabled();
    expect(typeSelect).toHaveAttribute(
      'title',
      'No puedes cambiar el tipo de un movimiento confirmado',
    );
  });

  it('muestra el error 409 que devuelve la API al editar', async () => {
    const onSubmitEdit = vi
      .fn()
      .mockRejectedValue(
        new ApiError(409, 'No puedes cambiar el tipo de un movimiento confirmado.'),
      );
    renderForm({ editing: existingTransaction, onSubmitEdit });
    const dialog = within(screen.getByRole('dialog'));

    await selectOption(dialog.getByRole('combobox', { name: 'Tipo' }), 'Ingreso');
    fireEvent.click(dialog.getByRole('button', { name: 'Guardar' }));

    expect(await dialog.findByRole('alert')).toHaveTextContent(
      'No puedes cambiar el tipo de un movimiento confirmado.',
    );
    expect(onSubmitEdit).toHaveBeenCalledWith(expect.objectContaining({ type: 'INCOME' }));
  });
});
