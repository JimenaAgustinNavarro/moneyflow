import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ObligationFilters } from './ObligationFilters';

describe('ObligationFilters', () => {
  it('cambia filtros y permite limpiar', async () => { const user = userEvent.setup(); const onChange = vi.fn(); render(<ObligationFilters filters={{}} accounts={[{ id: 'account-1', name: 'Principal' } as never]} categories={[]} onChange={onChange} onReset={vi.fn()} />); await user.click(screen.getByRole('checkbox', { name: 'Solo vencidas' })); expect(onChange).toHaveBeenCalledWith({ overdue: true }); await user.type(screen.getByLabelText('Desde'), '2026-11-01'); await user.click(screen.getByRole('button', { name: 'Limpiar filtros' })); });
});
