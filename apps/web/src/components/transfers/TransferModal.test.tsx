import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TransferModal } from './TransferModal';
import { ApiError } from '@/lib/api-client';
import type { Account } from '@/types/account';

const accounts: Account[] = [
  {
    id: 'account-1',
    name: 'Cuenta origen',
    type: 'BANK',
    currency: 'PEN',
    initialBalance: '100.00',
    balance: '100.00',
    archived: false,
    createdAt: '2026-10-23T00:00:00Z',
    updatedAt: '2026-10-23T00:00:00Z',
  },
  {
    id: 'account-2',
    name: 'Cuenta destino',
    type: 'WALLET',
    currency: 'PEN',
    initialBalance: '0.00',
    balance: '0.00',
    archived: false,
    createdAt: '2026-10-23T00:00:00Z',
    updatedAt: '2026-10-23T00:00:00Z',
  },
];

async function selectOption(trigger: HTMLElement, name: string) {
  fireEvent.keyDown(trigger, { key: 'ArrowDown', code: 'ArrowDown' });
  fireEvent.click(await screen.findByRole('option', { name }));
}

function renderModal(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  const onClose = vi.fn();
  const result = render(
    <TransferModal open onClose={onClose} onSubmit={onSubmit} accounts={accounts} />,
  );

  return { ...result, onClose, onSubmit };
}

describe('TransferModal', () => {
  it('muestra los campos y valida cuentas requeridas y monto', async () => {
    renderModal();
    const dialog = within(document.body).getByRole('dialog');

    expect(within(dialog).getByLabelText('Cuenta origen')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Cuenta destino')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Crear transferencia' }));

    expect(await within(dialog).findByText('Selecciona una cuenta de origen.')).toBeInTheDocument();
    expect(
      await within(dialog).findByText('Selecciona una cuenta de destino.'),
    ).toBeInTheDocument();
    expect(
      await within(dialog).findByText('Monto decimal con hasta 2 decimales.'),
    ).toBeInTheDocument();
  });

  it('excluye la cuenta elegida en el otro selector', async () => {
    renderModal();
    const dialog = within(document.body).getByRole('dialog');

    await selectOption(
      within(dialog).getByRole('combobox', { name: 'Cuenta origen' }),
      'Cuenta origen',
    );
    await fireEvent.keyDown(within(dialog).getByRole('combobox', { name: 'Cuenta destino' }), {
      key: 'ArrowDown',
      code: 'ArrowDown',
    });

    fireEvent.click(await screen.findByRole('option', { name: 'Cuenta destino' }));
    expect(screen.queryByRole('option', { name: 'Cuenta origen' })).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Cuenta origen' }), {
      key: 'ArrowDown',
      code: 'ArrowDown',
    });
    expect(await screen.findByRole('option', { name: 'Cuenta origen' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Cuenta destino' })).not.toBeInTheDocument();
  });

  it('envía fecha ISO con offset de Lima al crear', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const { onClose } = renderModal(onSubmit);
    const dialog = within(document.body).getByRole('dialog');

    await selectOption(
      within(dialog).getByRole('combobox', { name: 'Cuenta origen' }),
      'Cuenta origen',
    );
    await selectOption(
      within(dialog).getByRole('combobox', { name: 'Cuenta destino' }),
      'Cuenta destino',
    );
    await user.type(within(dialog).getByLabelText('Monto'), '25.50');
    fireEvent.change(within(dialog).getByLabelText('Fecha'), {
      target: { value: '2026-10-15' },
    });
    await user.type(within(dialog).getByLabelText('Descripción (opcional)'), 'Ahorro mensual');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Crear transferencia' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        originAccountId: 'account-1',
        destinationAccountId: 'account-2',
        amount: '25.50',
        description: 'Ahorro mensual',
        date: '2026-10-15T00:00:00-05:00',
      }),
    );
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('muestra sin transformar el error 400 del backend', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new ApiError(400, 'La fecha no puede ser futura.'));
    const user = userEvent.setup();
    renderModal(onSubmit);
    const dialog = within(document.body).getByRole('dialog');

    await selectOption(
      within(dialog).getByRole('combobox', { name: 'Cuenta origen' }),
      'Cuenta origen',
    );
    await selectOption(
      within(dialog).getByRole('combobox', { name: 'Cuenta destino' }),
      'Cuenta destino',
    );
    await user.type(within(dialog).getByLabelText('Monto'), '10.00');
    fireEvent.change(within(dialog).getByLabelText('Fecha'), {
      target: { value: '2099-01-01' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Crear transferencia' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'La fecha no puede ser futura.',
    );
  });
});
