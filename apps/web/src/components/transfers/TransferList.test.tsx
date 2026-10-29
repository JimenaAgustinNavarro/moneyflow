import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TransferList } from './TransferList';
import type { Transfer } from '@/types/transfer';

const transfer: Transfer = {
  id: 'transfer-1',
  originAccountId: 'account-1',
  destinationAccountId: 'account-2',
  amount: '50.00',
  currency: 'PEN',
  description: 'Ahorro',
  occurredAt: '2026-10-15T15:00:00.000Z',
  status: 'CONFIRMED',
  cancelledAt: null,
  createdAt: '2026-10-15T15:00:00.000Z',
  updatedAt: '2026-10-15T15:00:00.000Z',
};

describe('TransferList', () => {
  it('muestra la transferencia, cuentas, monto y estado', () => {
    render(
      <TransferList
        transfers={[transfer]}
        accountNameById={{ 'account-1': 'Origen', 'account-2': 'Destino' }}
        onEdit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const row = screen.getByRole('row', { name: /Origen Destino/ });
    expect(within(row).getByText('Confirmada')).toBeInTheDocument();
    expect(within(row).getByText(/50/)).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Editar transferencia' })).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Cancelar transferencia' })).toBeInTheDocument();
  });

  it('envía la transferencia seleccionada a editar y cancelar', () => {
    const onEdit = vi.fn();
    const onCancel = vi.fn();
    render(
      <TransferList
        transfers={[transfer]}
        accountNameById={{}}
        onEdit={onEdit}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Editar transferencia' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar transferencia' }));

    expect(onEdit).toHaveBeenCalledWith(transfer);
    expect(onCancel).toHaveBeenCalledWith(transfer);
  });

  it('muestra el estado vacío solicitado', () => {
    render(
      <TransferList transfers={[]} accountNameById={{}} onEdit={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.getByText('No hay transferencias.')).toBeInTheDocument();
  });
});
