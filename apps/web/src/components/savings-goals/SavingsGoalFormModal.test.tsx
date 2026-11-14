import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { SavingsGoal } from '@/types/savings-goal';

vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: () => ({ data: [], isError: false }),
}));

import { SavingsGoalFormModal } from './SavingsGoalFormModal';

const goal: SavingsGoal = {
  id: 'goal-1',
  userId: 'user-1',
  name: 'Viaje',
  targetAmount: '1000.00',
  currentAmount: '500.00',
  percentage: 50,
  targetDate: '2027-01-15',
  accountId: null,
  status: 'ACTIVE',
  contributions: [],
  createdAt: '',
  updatedAt: '',
  deletedAt: null,
};

describe('SavingsGoalFormModal', () => {
  it('muestra los campos del formulario', () => {
    render(
      <SavingsGoalFormModal
        open
        onClose={vi.fn()}
        onSubmitCreate={vi.fn()}
        onSubmitEdit={vi.fn()}
        editing={null}
      />,
    );
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
    expect(screen.getByLabelText('Monto objetivo')).toBeInTheDocument();
    expect(screen.getByLabelText('Cuenta (opcional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Fecha objetivo (opcional)')).toBeInTheDocument();
  });

  it('valida nombre y monto antes de enviar', async () => {
    const onSubmitCreate = vi.fn();
    render(
      <SavingsGoalFormModal
        open
        onClose={vi.fn()}
        onSubmitCreate={onSubmitCreate}
        onSubmitEdit={vi.fn()}
        editing={null}
      />,
    );
    await userEvent.setup().click(screen.getByRole('button', { name: 'Crear meta' }));
    expect(await screen.findByText('El nombre es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('Ingresa un monto con hasta 2 decimales.')).toBeInTheDocument();
    expect(onSubmitCreate).not.toHaveBeenCalled();
  });

  it('envía los datos de creación válidos', async () => {
    const onSubmitCreate = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(
      <SavingsGoalFormModal
        open
        onClose={onClose}
        onSubmitCreate={onSubmitCreate}
        onSubmitEdit={vi.fn()}
        editing={null}
      />,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Nombre'), 'Viaje');
    await user.type(screen.getByLabelText('Monto objetivo'), '1000.00');
    fireEvent.change(screen.getByLabelText('Fecha objetivo (opcional)'), {
      target: { value: '2027-01-15' },
    });
    await user.click(screen.getByRole('button', { name: 'Crear meta' }));

    await waitFor(() =>
      expect(onSubmitCreate).toHaveBeenCalledWith({
        name: 'Viaje',
        targetAmount: '1000.00',
        targetDate: '2027-01-15',
        accountId: null,
      }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('no envía una fecha vacía al editar', async () => {
    const onSubmitEdit = vi.fn().mockResolvedValue(undefined);
    render(
      <SavingsGoalFormModal
        open
        onClose={vi.fn()}
        onSubmitCreate={vi.fn()}
        onSubmitEdit={onSubmitEdit}
        editing={goal}
      />,
    );
    fireEvent.change(screen.getByLabelText('Fecha objetivo (opcional)'), {
      target: { value: '' },
    });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() =>
      expect(onSubmitEdit).toHaveBeenCalledWith({
        name: 'Viaje',
        targetAmount: '1000.00',
        accountId: null,
      }),
    );
    expect(onSubmitEdit.mock.calls[0]?.[0]).not.toHaveProperty('targetDate');
  });

  it('envía una nueva fecha objetivo al editar', async () => {
    const onSubmitEdit = vi.fn().mockResolvedValue(undefined);
    render(
      <SavingsGoalFormModal
        open
        onClose={vi.fn()}
        onSubmitCreate={vi.fn()}
        onSubmitEdit={onSubmitEdit}
        editing={goal}
      />,
    );
    fireEvent.change(screen.getByLabelText('Fecha objetivo (opcional)'), {
      target: { value: '2027-02-20' },
    });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() =>
      expect(onSubmitEdit).toHaveBeenCalledWith({
        name: 'Viaje',
        targetAmount: '1000.00',
        targetDate: '2027-02-20',
        accountId: null,
      }),
    );
  });
});
