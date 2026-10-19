import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AccountFormModal } from './AccountFormModal';
import type { Account } from '@/types/account';

const account: Account = {
  id: 'account-1',
  name: 'Ahorros',
  type: 'BANK',
  currency: 'PEN',
  initialBalance: '100.00',
  balance: '100.00',
  archived: false,
  createdAt: '2026-10-18T00:00:00Z',
  updatedAt: '2026-10-18T00:00:00Z',
};

describe('AccountFormModal', () => {
  it('crea una cuenta incluyendo saldo inicial y moneda predeterminada', async () => {
    const user = userEvent.setup();
    const onSubmitCreate = vi.fn().mockResolvedValue(undefined);
    render(
      <AccountFormModal
        open
        account={null}
        onClose={vi.fn()}
        onSubmitCreate={onSubmitCreate}
        onSubmitEdit={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText('Nombre'), 'Cuenta sueldo');
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => {
      expect(onSubmitCreate).toHaveBeenCalledWith({
        name: 'Cuenta sueldo',
        type: 'BANK',
        initialBalance: '0.00',
        currency: 'PEN',
      });
    });
  });

  it('edita solo nombre y tipo, sin campos de saldo o moneda', async () => {
    const user = userEvent.setup();
    const onSubmitEdit = vi.fn().mockResolvedValue(undefined);
    render(
      <AccountFormModal
        open
        account={account}
        onClose={vi.fn()}
        onSubmitCreate={vi.fn()}
        onSubmitEdit={onSubmitEdit}
      />,
    );

    const nameInput = screen.getByLabelText('Nombre');
    await user.clear(nameInput);
    await user.type(nameInput, 'Ahorros actualizada');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => {
      expect(onSubmitEdit).toHaveBeenCalledWith('account-1', {
        name: 'Ahorros actualizada',
        type: 'BANK',
      });
    });
    expect(screen.queryByLabelText('Saldo inicial')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Moneda')).not.toBeInTheDocument();
  });

  it('muestra errores de validación antes de enviar', async () => {
    render(
      <AccountFormModal
        open
        account={null}
        onClose={vi.fn()}
        onSubmitCreate={vi.fn()}
        onSubmitEdit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(await screen.findByText('Ingresa un nombre.')).toBeInTheDocument();
  });
});
