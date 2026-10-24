import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TransactionList } from './TransactionList';
import { formatCurrency } from '@/lib/format-currency';
import type { Transaction } from '@/types/transaction';

const transaction: Transaction = {
  id: 'transaction-1',
  accountId: 'account-1',
  categoryId: 'category-1',
  type: 'INCOME',
  amount: '1250.00',
  currency: 'PEN',
  description: 'Pago de salario',
  date: '2026-10-23T10:00:00.000Z',
  status: 'CONFIRMED',
  transferId: null,
  counterpartAccountId: null,
  obligationId: null,
  createdAt: '2026-10-23T10:00:00.000Z',
  updatedAt: '2026-10-23T10:00:00.000Z',
};

function renderList(transactions = [transaction]) {
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  const result = render(
    <TransactionList
      transactions={transactions}
      categoryNameById={{ 'category-1': 'Sueldo' }}
      accountNameById={{ 'account-1': 'Cuenta principal' }}
      onEdit={onEdit}
      onDelete={onDelete}
    />,
  );

  return { ...result, onEdit, onDelete };
}

describe('TransactionList', () => {
  it('muestra los datos del movimiento, su tipo y el monto formateado', () => {
    renderList();

    const row = screen.getByRole('row', { name: /Pago de salario/ });
    expect(within(row).getByText('Ingreso')).toHaveClass('bg-emerald-100');
    expect(within(row).getByText('Sueldo')).toBeInTheDocument();
    expect(within(row).getByText('Cuenta principal')).toBeInTheDocument();
    expect(within(row).getByText(formatCurrency('1250.00', 'PEN'))).toHaveClass('text-emerald-600');
  });

  it('envía la fila seleccionada a las acciones de editar y borrar', () => {
    const { onEdit, onDelete } = renderList();

    fireEvent.click(screen.getByRole('button', { name: 'Editar movimiento' }));
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar movimiento' }));

    expect(onEdit).toHaveBeenCalledWith(transaction);
    expect(onDelete).toHaveBeenCalledWith(transaction);
  });

  it('muestra transferencias con un badge azul genérico y bloquea las acciones individuales', () => {
    const transfer: Transaction = {
      ...transaction,
      type: 'TRANSFER',
      transferId: 'transfer-1',
      categoryId: null,
    };
    renderList([transfer]);

    const row = screen.getByRole('row', { name: /Transferencia/ });
    expect(within(row).getByText('Transferencia')).toHaveClass('bg-blue-100');
    expect(screen.getByRole('button', { name: 'Editar movimiento' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Eliminar movimiento' })).toBeDisabled();
  });

  it('muestra el estado vacío', () => {
    renderList([]);

    expect(screen.getByText('No hay movimientos para mostrar.')).toBeInTheDocument();
  });
});
