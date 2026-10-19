import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Account } from '@/types/account';

import { AccountCard } from './AccountCard';

const account: Account = {
  id: 'account-1',
  name: 'Ahorros',
  type: 'BANK',
  currency: 'PEN',
  initialBalance: '100.00',
  balance: '1000.00',
  archived: false,
  createdAt: '2026-10-18T00:00:00Z',
  updatedAt: '2026-10-18T00:00:00Z',
};

describe('AccountCard', () => {
  it('muestra nombre, tipo y saldo formateado y comunica la edición', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <AccountCard
        account={account}
        onEdit={onEdit}
        onRecalculate={vi.fn()}
        onToggleArchive={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Ahorros' })).toBeInTheDocument();
    expect(screen.getByText('Banco')).toBeInTheDocument();
    expect(screen.getByText('S/ 1,000.00')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ahorros Banco/ })).toHaveAttribute(
      'href',
      '/accounts/account-1',
    );

    await user.click(screen.getByRole('button', { name: 'Acciones de Ahorros' }));
    await user.click(await screen.findByText('Editar'));
    expect(onEdit).toHaveBeenCalledWith(account);
  });
});
