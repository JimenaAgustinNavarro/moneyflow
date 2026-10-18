import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

import { Sidebar } from './Sidebar';

describe('Sidebar', () => {
  it('muestra Dashboard activo y los módulos futuros deshabilitados', () => {
    render(<Sidebar />);

    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');

    for (const label of [
      'Cuentas',
      'Categorías',
      'Movimientos',
      'Presupuestos',
      'Metas',
      'Configuración',
    ]) {
      expect(screen.getByText(label)).toHaveAttribute('aria-disabled', 'true');
      expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument();
    }
  });
});
