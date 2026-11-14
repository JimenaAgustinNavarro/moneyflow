import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api-client';
import type { SavingsGoal } from '@/types/savings-goal';
import { GoalContributionModal } from './GoalContributionModal';

const goal: SavingsGoal = {
  id: 'goal-1',
  userId: 'user-1',
  name: 'Viaje',
  targetAmount: '1000.00',
  currentAmount: '10.00',
  percentage: 1,
  targetDate: null,
  accountId: null,
  status: 'ACTIVE',
  contributions: [],
  createdAt: '',
  updatedAt: '',
  deletedAt: null,
};

async function selectWithdrawal() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('combobox', { name: 'Tipo' }));
  await user.click(screen.getByRole('option', { name: 'Retirar' }));
}

describe('GoalContributionModal', () => {
  it('muestra el saldo y los campos', () => {
    render(
      <GoalContributionModal
        open
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        goal={goal}
      />,
    );
    expect(screen.getByText(/Saldo disponible/)).toBeInTheDocument();
    expect(screen.getByLabelText('Monto')).toBeInTheDocument();
    expect(screen.getByLabelText('Fecha')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Tipo' })).toBeInTheDocument();
  });

  it('valida el monto requerido', async () => {
    const onSubmit = vi.fn();
    render(
      <GoalContributionModal open onClose={vi.fn()} onSubmit={onSubmit} goal={goal} />,
    );
    await userEvent.setup().click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Ingresa un monto con hasta 2 decimales.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('registra un depósito válido', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <GoalContributionModal open onClose={vi.fn()} onSubmit={onSubmit} goal={goal} />,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Monto'), '5.25');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ amount: '5.25', type: 'DEPOSIT' }),
      ),
    );
    expect(onSubmit.mock.calls[0]?.[0].date).toMatch(/T00:00:00-05:00$/);
  });

  it('bloquea un retiro superior al saldo sin llamar al servidor', async () => {
    const onSubmit = vi.fn();
    render(
      <GoalContributionModal open onClose={vi.fn()} onSubmit={onSubmit} goal={goal} />,
    );
    await selectWithdrawal();
    await userEvent.setup().type(screen.getByLabelText('Monto'), '10.01');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('El retiro no puede superar el saldo disponible.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('registra un retiro dentro del saldo disponible', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <GoalContributionModal open onClose={vi.fn()} onSubmit={onSubmit} goal={goal} />,
    );
    await selectWithdrawal();
    await userEvent.setup().type(screen.getByLabelText('Monto'), '10.00');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ amount: '10.00', type: 'WITHDRAWAL' }),
      ),
    );
  });

  it('muestra los errores devueltos por el servidor', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new ApiError(400, 'Retiro no permitido.'));
    render(
      <GoalContributionModal open onClose={vi.fn()} onSubmit={onSubmit} goal={goal} />,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Monto'), '1.00');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Retiro no permitido.');
  });
});
