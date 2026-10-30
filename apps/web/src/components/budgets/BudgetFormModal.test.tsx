import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Category } from '@/types/category';
import type { Budget } from '@/types/budget';
import { BudgetFormModal } from './BudgetFormModal';

const expenseId = '11111111-1111-4111-8111-111111111111';
const categories: Category[] = [
  { id: expenseId, name: 'Servicios', type: 'EXPENSE', parentId: null, icon: null, color: null, isSystem: false, createdAt: '' },
  { id: '22222222-2222-4222-8222-222222222222', name: 'Salario', type: 'INCOME', parentId: null, icon: null, color: null, isSystem: false, createdAt: '' },
];
const budget: Budget = { id: 'budget-1', userId: 'user-1', name: 'Hogar', limit: '500.00', currency: 'PEN', periodType: 'MONTHLY', startDate: '2026-10-01T00:00:00-05:00', endDate: null, alertThreshold: 80, active: true, categories: [{ id: expenseId, name: 'Servicios', type: 'EXPENSE' }], createdAt: '', updatedAt: '', deletedAt: null };

describe('BudgetFormModal', () => {
  it('renderiza campos y filtra categorías de gasto', () => {
    render(<BudgetFormModal open onClose={vi.fn()} onSubmitCreate={vi.fn()} categories={categories} editing={null} />);
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
    expect(screen.getByLabelText('Límite')).toBeInTheDocument();
    expect(screen.getByText('Servicios')).toBeInTheDocument();
    expect(screen.queryByText('Salario')).not.toBeInTheDocument();
  });

  it('valida límite y categorías vacías', async () => {
    const user = userEvent.setup();
    render(<BudgetFormModal open onClose={vi.fn()} onSubmitCreate={vi.fn()} categories={categories} editing={null} />);
    await user.type(screen.getByLabelText('Nombre'), 'Hogar');
    await user.type(screen.getByLabelText('Límite'), 'abc');
    await user.click(screen.getByRole('button', { name: 'Crear presupuesto' }));
    expect(await screen.findByText('Monto decimal con hasta 2 decimales.')).toBeInTheDocument();
    expect(screen.getByText('Selecciona al menos una categoría.')).toBeInTheDocument();
  });

  it('envía creación con categoría seleccionada', async () => {
    const user = userEvent.setup();
    const onSubmitCreate = vi.fn().mockResolvedValue(undefined);
    render(<BudgetFormModal open onClose={vi.fn()} onSubmitCreate={onSubmitCreate} categories={categories} editing={null} />);
    await user.type(screen.getByLabelText('Nombre'), 'Hogar');
    await user.type(screen.getByLabelText('Límite'), '500.00');
    await user.click(screen.getByRole('checkbox', { name: 'Servicios' }));
    await user.click(screen.getByRole('button', { name: 'Crear presupuesto' }));
    await waitFor(() => expect(onSubmitCreate).toHaveBeenCalled());
    expect(onSubmitCreate.mock.calls[0][0]).toMatchObject({ name: 'Hogar', limit: '500.00', categoryIds: [expenseId] });
  });

  it('prellena edición y envía actualización', async () => {
    const user = userEvent.setup();
    const onSubmitEdit = vi.fn().mockResolvedValue(undefined);
    render(<BudgetFormModal open onClose={vi.fn()} onSubmitCreate={vi.fn()} onSubmitEdit={onSubmitEdit} categories={categories} editing={budget} />);
    expect(screen.getByLabelText('Nombre')).toHaveValue('Hogar');
    expect(screen.getByRole('checkbox', { name: 'Servicios' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(onSubmitEdit).toHaveBeenCalled());
  });
});
