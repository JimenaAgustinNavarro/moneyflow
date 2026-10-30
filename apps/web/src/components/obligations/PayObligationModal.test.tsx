import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Account } from '@/types/account';
import type { Obligation } from '@/types/obligation';
import { PayObligationModal } from './PayObligationModal';

const account: Account = { id: '11111111-1111-4111-8111-111111111111', name: 'Principal', type: 'BANK', currency: 'PEN', initialBalance: '0', balance: '0', archived: false, deletedAt: null, createdAt: '', updatedAt: '' };
const obligation: Obligation = { id: 'obligation-1', userId: 'user-1', recurrenceId: null, accountId: account.id, accountName: account.name, categoryId: null, categoryName: null, name: 'Luz', type: 'EXPENSE', amount: '100.00', currency: 'PEN', description: null, dueDate: '2026-11-01T00:00:00-05:00', status: 'PARTIALLY_PAID', periodStart: null, periodEnd: null, paidAt: null, cancelledAt: null, createdAt: '', updatedAt: '', deletedAt: null, payments: [{ id: 'payment-1', obligationId: 'obligation-1', transactionId: 'transaction-1', amount: '40.00', paidAt: '', status: 'CONFIRMED', createdAt: '' }] };

describe('PayObligationModal', () => {
  it('muestra el total, pagado y pendiente', () => { render(<PayObligationModal open onClose={vi.fn()} onSubmit={vi.fn()} accounts={[account]} obligation={obligation} />); expect(screen.getByText('S/ 100.00')).toBeInTheDocument(); expect(screen.getByText('S/ 40.00')).toBeInTheDocument(); expect(screen.getByText('S/ 60.00')).toBeInTheDocument(); });
  it('envía el pago pendiente', async () => { const user = userEvent.setup(); const onSubmit = vi.fn().mockResolvedValue(undefined); render(<PayObligationModal open onClose={vi.fn()} onSubmit={onSubmit} accounts={[account]} obligation={obligation} />); await user.click(screen.getByRole('button', { name: 'Pagar' })); expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ amount: '60.00', accountId: account.id })); });
});
