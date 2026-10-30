import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { BudgetFilters } from './BudgetFilters';

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ children }: { children: ReactNode }) => <option>{children}</option>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
}));

describe('BudgetFilters', () => {
  it('renderiza los controles', () => {
    render(<BudgetFilters filters={{}} onChange={vi.fn()} onReset={vi.fn()} />);
    expect(screen.getByText('Estado')).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Mostrar eliminados' })).toBeInTheDocument();
  });

  it('cambia includeDeleted y limpia filtros', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onReset = vi.fn();
    render(<BudgetFilters filters={{}} onChange={onChange} onReset={onReset} />);
    await user.click(screen.getByRole('checkbox', { name: 'Mostrar eliminados' }));
    expect(onChange).toHaveBeenCalledWith({ includeDeleted: true });
    await user.click(screen.getByRole('button', { name: 'Limpiar' }));
    expect(onReset).toHaveBeenCalled();
  });
});
