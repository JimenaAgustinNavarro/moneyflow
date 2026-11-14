import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SavingsGoalFilters } from './SavingsGoalFilters';

describe('SavingsGoalFilters', () => {
  it('muestra filtro de estado, eliminadas y limpiar', () => {
    render(
      <SavingsGoalFilters filters={{ page: 3, limit: 20 }} onChange={vi.fn()} onReset={vi.fn()} />,
    );
    expect(screen.getByRole('combobox', { name: 'Estado' })).toBeInTheDocument();
    expect(screen.getByLabelText('Mostrar eliminadas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Limpiar' })).toBeInTheDocument();
  });

  it('cambia estado y reinicia página', async () => {
    const onChange = vi.fn();
    render(
      <SavingsGoalFilters
        filters={{ page: 4, limit: 20 }}
        onChange={onChange}
        onReset={vi.fn()}
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('combobox', { name: 'Estado' }));
    await user.click(screen.getByRole('option', { name: 'Completadas' }));
    expect(onChange).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      status: 'COMPLETED',
    });
  });

  it('incluye eliminadas y reinicia página', () => {
    const onChange = vi.fn();
    render(
      <SavingsGoalFilters
        filters={{ page: 2, limit: 20 }}
        onChange={onChange}
        onReset={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByLabelText('Mostrar eliminadas'));
    expect(onChange).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      includeDeleted: true,
    });
  });

  it('solicita limpiar filtros', async () => {
    const onReset = vi.fn();
    render(
      <SavingsGoalFilters filters={{}} onChange={vi.fn()} onReset={onReset} />,
    );
    await userEvent.setup().click(screen.getByRole('button', { name: 'Limpiar' }));
    expect(onReset).toHaveBeenCalled();
  });
});
