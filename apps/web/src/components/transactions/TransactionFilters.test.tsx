import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TransactionFilters } from './TransactionFilters';

const accounts = [
  {
    id: 'account-1',
    name: 'Cuenta principal',
    type: 'BANK' as const,
    currency: 'PEN',
    initialBalance: '0.00',
    balance: '0.00',
    archived: false,
    createdAt: '2026-10-23T00:00:00Z',
    updatedAt: '2026-10-23T00:00:00Z',
  },
];

const categories = [
  {
    id: 'category-1',
    name: 'Alimentación',
    type: 'EXPENSE' as const,
    parentId: null,
    icon: null,
    color: null,
    isSystem: false,
    createdAt: '2026-10-23T00:00:00Z',
  },
];

function renderFilters() {
  const onChange = vi.fn();
  const onReset = vi.fn();
  const result = render(
    <TransactionFilters
      filters={{ page: 4, limit: 20 }}
      accounts={accounts}
      categories={categories}
      onChange={onChange}
      onReset={onReset}
    />,
  );

  return { ...result, onChange, onReset };
}

async function selectOption(trigger: HTMLElement, name: string) {
  fireEvent.keyDown(trigger, { key: 'ArrowDown', code: 'ArrowDown' });
  fireEvent.click(await screen.findByRole('option', { name }));
}

describe('TransactionFilters', () => {
  it('muestra cuenta, categoría, tipo y rango de fechas', () => {
    renderFilters();

    expect(screen.getByRole('combobox', { name: 'Cuenta' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Categoría' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Tipo' })).toBeInTheDocument();
    expect(screen.getByLabelText('Desde')).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText('Hasta')).toHaveAttribute('type', 'date');
    expect(screen.queryByLabelText('Estado')).not.toBeInTheDocument();
  });

  it('actualiza cuenta y tipo reiniciando la página a 1', async () => {
    const { onChange } = renderFilters();

    await selectOption(screen.getByRole('combobox', { name: 'Cuenta' }), 'Cuenta principal');
    expect(onChange).toHaveBeenLastCalledWith({
      page: 1,
      limit: 20,
      accountId: 'account-1',
    });

    await selectOption(screen.getByRole('combobox', { name: 'Tipo' }), 'Ingreso');
    expect(onChange).toHaveBeenLastCalledWith({
      page: 1,
      limit: 20,
      type: 'INCOME',
    });
  });

  it('envía el rango de fecha en el formato del input y permite limpiar filtros', async () => {
    const { onChange, onReset } = renderFilters();

    fireEvent.change(screen.getByLabelText('Desde'), { target: { value: '2026-10-01' } });
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        from: '2026-10-01',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(onReset).toHaveBeenCalledOnce();
  });
});
