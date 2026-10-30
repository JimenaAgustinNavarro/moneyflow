import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Recurrence } from '@/types/recurrence';
import { RecurrenceList } from './RecurrenceList';

const recurrence: Recurrence = {
  id: 'recurrence-1', userId: 'user-1', name: 'Alquiler', type: 'EXPENSE',
  amount: '1200.00', currency: 'PEN', description: null, frequency: 'MONTHLY',
  dayOfPeriod: 1, startDate: '2026-01-01T00:00:00-05:00', endDate: null,
  nextDueDate: '2026-11-01T00:00:00-05:00', active: true,
  accountId: 'account-1', accountName: 'Cuenta principal', categoryId: null,
  categoryName: null, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', deletedAt: null,
};

describe('RecurrenceList', () => {
  it('muestra el estado vacío', () => {
    render(<RecurrenceList recurrences={[]} onEdit={vi.fn()} onToggle={vi.fn()} onDelete={vi.fn()} onRestore={vi.fn()} />);
    expect(screen.getByText('No hay recurrencias. Crea la primera.')).toBeInTheDocument();
  });

  it('renderiza datos y ejecuta las acciones principales', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onToggle = vi.fn();
    const onDelete = vi.fn();
    render(<RecurrenceList recurrences={[recurrence]} onEdit={onEdit} onToggle={onToggle} onDelete={onDelete} onRestore={vi.fn()} />);

    expect(screen.getByText('Alquiler')).toBeInTheDocument();
    expect(screen.getByText('Mensual')).toBeInTheDocument();
    expect(screen.getByText('Cuenta principal')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Editar Alquiler' }));
    await user.click(screen.getByRole('button', { name: 'Eliminar Alquiler' }));
    await user.click(screen.getByRole('button', { name: 'Desactivar Alquiler' }));
    expect(onEdit).toHaveBeenCalledWith(recurrence);
    expect(onDelete).toHaveBeenCalledWith(recurrence);
    expect(onToggle).toHaveBeenCalledWith(recurrence);
  });

  it('permite restaurar recurrencias eliminadas', async () => {
    const user = userEvent.setup();
    const onRestore = vi.fn();
    render(<RecurrenceList recurrences={[{ ...recurrence, deletedAt: '2026-01-02T00:00:00Z' }]} onEdit={vi.fn()} onToggle={vi.fn()} onDelete={vi.fn()} onRestore={onRestore} />);
    await user.click(screen.getByRole('button', { name: 'Restaurar Alquiler' }));
    expect(onRestore).toHaveBeenCalled();
  });
});
