import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

import { Sidebar } from './Sidebar';

describe('Sidebar', () => {
  it('muestra Dashboard y Cuentas activos, Categorías habilitada', () => {
    render(<Sidebar />);

    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Cuentas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Categorías' })).toHaveAttribute('href', '/categories');
    expect(screen.getByRole('link', { name: 'Movimientos' })).toHaveAttribute(
      'href',
      '/transactions',
    );

    for (const label of ['Presupuestos', 'Metas', 'Configuración']) {
      expect(screen.getByText(label)).toHaveAttribute('aria-disabled', 'true');
      expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument();
    }
  });
});
