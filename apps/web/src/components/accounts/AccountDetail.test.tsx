import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Account } from '@/types/account';

import { AccountDetail } from './AccountDetail';

const account: Account = {
  id: 'account-1',
  name: 'Ahorros',
  type: 'BANK',
  currency: 'PEN',
  initialBalance: '100.00',
  balance: '125.50',
  archived: true,
  createdAt: '2026-10-18T00:00:00Z',
  updatedAt: '2026-10-18T00:00:00Z',
};

describe('AccountDetail', () => {
  it('muestra el detalle, el estado archivado y las acciones disponibles', () => {
    const onEdit = vi.fn();
    const onRecalculate = vi.fn();

    render(<AccountDetail account={account} onEdit={onEdit} onRecalculate={onRecalculate} />);

    expect(screen.getByRole('heading', { name: 'Ahorros' })).toBeInTheDocument();
    expect(screen.getByText('Banco')).toBeInTheDocument();
    expect(screen.getByText('Archivada')).toBeInTheDocument();
    expect(screen.getByText('S/ 125.50')).toBeInTheDocument();
    expect(screen.getByText('PEN')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a cuentas' })).toHaveAttribute(
      'href',
      '/accounts',
    );
    expect(screen.queryByRole('button', { name: 'Restaurar' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Recalcular saldo' }));

    expect(onEdit).toHaveBeenCalledOnce();
    expect(onRecalculate).toHaveBeenCalledOnce();
  });
});
