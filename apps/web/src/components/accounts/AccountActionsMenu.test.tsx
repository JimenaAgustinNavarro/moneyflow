import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AccountActionsMenu } from './AccountActionsMenu';
import type { Account } from '@/types/account';

const account: Account = {
  id: 'account-1',
  name: 'Ahorros',
  type: 'BANK',
  currency: 'PEN',
  initialBalance: '100.00',
  balance: '125.00',
  archived: false,
  deletedAt: null,
  createdAt: '2026-10-18T00:00:00Z',
  updatedAt: '2026-10-18T00:00:00Z',
};

describe('AccountActionsMenu', () => {
  it('expone editar, archivar y recalcular, sin eliminar ni restaurar', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onRecalculate = vi.fn();
    const onToggleArchive = vi.fn();
    render(
      <AccountActionsMenu
        account={account}
        onEdit={onEdit}
        onRecalculate={onRecalculate}
        onToggleArchive={onToggleArchive}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Acciones de Ahorros' }));

    expect(await screen.findByText('Editar')).toBeInTheDocument();
    expect(screen.getByText('Archivar')).toBeInTheDocument();
    expect(screen.getByText('Recalcular saldo')).toBeInTheDocument();
    expect(screen.queryByText('Eliminar')).not.toBeInTheDocument();
    expect(screen.queryByText('Restaurar')).not.toBeInTheDocument();
  });

  it('muestra Desarchivar para una cuenta archivada', async () => {
    const user = userEvent.setup();
    render(
      <AccountActionsMenu
        account={{ ...account, archived: true }}
        onEdit={vi.fn()}
        onRecalculate={vi.fn()}
        onToggleArchive={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Acciones de Ahorros' }));
    expect(await screen.findByText('Desarchivar')).toBeInTheDocument();
  });
});
