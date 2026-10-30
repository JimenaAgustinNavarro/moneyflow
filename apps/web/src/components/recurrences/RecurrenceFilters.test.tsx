import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Account } from '@/types/account';
import type { Category } from '@/types/category';
import { RecurrenceFilters } from './RecurrenceFilters';

const accounts = [{ id: 'account-1', name: 'Cuenta principal' } as Account];
const categories = [{ id: 'category-1', name: 'Vivienda', type: 'EXPENSE' } as Category];

describe('RecurrenceFilters', () => {
  it('cambia filtros y permite reiniciarlos', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onReset = vi.fn();
    render(<RecurrenceFilters filters={{}} accounts={accounts} categories={categories} onChange={onChange} onReset={onReset} />);

    await user.click(screen.getByLabelText('Mostrar eliminadas'));
    expect(onChange).toHaveBeenCalledWith({ includeDeleted: true });

    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
