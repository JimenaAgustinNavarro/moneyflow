import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Budget } from '@/types/budget';
import { CopyBudgetModal } from './CopyBudgetModal';

const budget: Budget = {
  id: 'budget-1', userId: 'user-1', name: 'Hogar', limit: '500.00', currency: 'PEN',
  periodType: 'MONTHLY', startDate: '2026-10-01T00:00:00-05:00',
  endDate: '2026-10-31T00:00:00-05:00', alertThreshold: 80, active: true,
  categories: [], createdAt: '', updatedAt: '', deletedAt: null,
};

describe('CopyBudgetModal', () => {
  it('renderiza campos y precarga la siguiente fecha', () => {
    render(<CopyBudgetModal open onClose={vi.fn()} onSubmit={vi.fn()} budget={budget} />);
    expect(screen.getByLabelText('Nombre (opcional)')).toHaveValue('Hogar (copia)');
    expect(screen.getByLabelText('Inicio')).toHaveValue('2026-11-01');
    expect(screen.getByLabelText('Fin (opcional)')).toHaveValue('2026-11-30');
  });

  it('envía la copia', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<CopyBudgetModal open onClose={vi.fn()} onSubmit={onSubmit} budget={budget} />);
    await user.click(screen.getByRole('button', { name: 'Duplicar' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ name: 'Hogar (copia)' });
  });
});
