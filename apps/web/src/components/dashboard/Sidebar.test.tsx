import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

import { Sidebar } from './Sidebar';

describe('Sidebar', () => {
  it('muestra Dashboard y Cuentas activos, Categorías habilitada', () => {
    render(<Sidebar />);

    const dashboardLink = screen.getByRole('link', { name: 'Dashboard' });
    expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    expect(dashboardLink).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Cuentas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Categorías' })).toHaveAttribute('href', '/categories');
    expect(screen.getByRole('link', { name: 'Movimientos' })).toHaveAttribute(
      'href',
      '/transactions',
    );

    for (const label of ['Presupuestos', 'Metas', 'Configuración']) {
      expect(screen.getByLabelText(label)).toHaveAttribute('aria-disabled', 'true');
      expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument();
    }
  });

  it('proporciona nombres y títulos accesibles en los enlaces habilitados', () => {
    render(<Sidebar />);

    for (const label of ['Dashboard', 'Cuentas', 'Categorías', 'Movimientos']) {
      const link = screen.getByRole('link', { name: label });
      expect(link).toHaveAttribute('aria-label', label);
      expect(link).toHaveAttribute('title', label);
    }
  });

  it('marca como deshabilitados los elementos aún no disponibles', () => {
    render(<Sidebar />);

    for (const label of ['Presupuestos', 'Metas', 'Configuración']) {
      const item = screen.getByLabelText(label);
      expect(item).toHaveAttribute('aria-disabled', 'true');
      expect(item).toHaveAttribute('title', 'Próximamente');
    }
  });
});
