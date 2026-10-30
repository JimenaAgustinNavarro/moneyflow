import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Account } from '@/types/account';
import type { Category } from '@/types/category';
import { RecurrenceFormModal } from './RecurrenceFormModal';

const accounts = [{ id: 'account-1', name: 'Cuenta principal' } as Account];
const categories = [{ id: 'category-1', name: 'Vivienda', type: 'EXPENSE' } as Category];

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  onSubmitCreate: vi.fn().mockResolvedValue(undefined),
  onSubmitEdit: vi.fn().mockResolvedValue(undefined),
  accounts,
  categories,
  editing: null,
};

describe('RecurrenceFormModal', () => {
  it('valida los campos requeridos', async () => {
    const user = userEvent.setup();
    render(<RecurrenceFormModal {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: 'Crear recurrencia' }));
    expect(await screen.findByText('Nombre requerido.')).toBeInTheDocument();
  });

  it('muestra el día del período para frecuencias mensuales', () => {
    render(<RecurrenceFormModal {...defaultProps} />);
    expect(screen.getByLabelText('Día del período (1-31)')).toBeInTheDocument();
  });

  it('envía una recurrencia válida', async () => {
    const user = userEvent.setup();
    const onSubmitCreate = vi.fn().mockResolvedValue(undefined);
    render(<RecurrenceFormModal {...defaultProps} onSubmitCreate={onSubmitCreate} />);

    await user.type(screen.getByLabelText('Nombre'), 'Alquiler');
    await user.type(screen.getByLabelText('Monto'), '1200.00');
    await user.click(screen.getByRole('button', { name: 'Crear recurrencia' }));

    expect(onSubmitCreate).not.toHaveBeenCalled();
  });
});
