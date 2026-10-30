import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Account } from '@/types/account';
import type { Category } from '@/types/category';
import type { Obligation } from '@/types/obligation';
import { ObligationFormModal } from './ObligationFormModal';

const account: Account = { id: '11111111-1111-4111-8111-111111111111', name: 'Principal', type: 'BANK', currency: 'PEN', initialBalance: '0', balance: '0', archived: false, deletedAt: null, createdAt: '', updatedAt: '' };
const categories: Category[] = [{ id: '22222222-2222-4222-8222-222222222222', name: 'Servicios', type: 'EXPENSE', parentId: null, icon: null, color: null, isSystem: false, createdAt: '' }];
const obligation: Obligation = { id: 'obligation-1', userId: 'user-1', recurrenceId: null, accountId: account.id, accountName: account.name, categoryId: categories[0].id, categoryName: categories[0].name, name: 'Luz', type: 'EXPENSE', amount: '100.00', currency: 'PEN', description: 'Mensual', dueDate: '2026-11-01T00:00:00-05:00', status: 'PENDING', periodStart: null, periodEnd: null, paidAt: null, cancelledAt: null, createdAt: '', updatedAt: '', deletedAt: null, payments: [] };

describe('ObligationFormModal', () => {
  it('valida los campos obligatorios', async () => { const user = userEvent.setup(); const onSubmitCreate = vi.fn().mockResolvedValue(undefined); render(<ObligationFormModal open onClose={vi.fn()} onSubmitCreate={onSubmitCreate} accounts={[account]} categories={categories} editing={null} />); await user.click(screen.getByRole('button', { name: 'Crear obligación' })); await waitFor(() => expect(screen.getByText('Nombre requerido.')).toBeInTheDocument()); expect(onSubmitCreate).not.toHaveBeenCalled(); });
  it('prellena el formulario al editar', () => { render(<ObligationFormModal open onClose={vi.fn()} onSubmitCreate={vi.fn()} onSubmitEdit={vi.fn()} accounts={[account]} categories={categories} editing={obligation} />); expect(screen.getByLabelText('Nombre')).toHaveValue('Luz'); expect(screen.getByLabelText('Monto')).toHaveValue('100.00'); });
});
