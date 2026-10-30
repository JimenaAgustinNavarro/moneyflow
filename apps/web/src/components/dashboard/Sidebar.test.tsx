import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pathname = vi.hoisted(() => vi.fn(() => '/dashboard'));

vi.mock('next/navigation', () => ({
  usePathname: pathname,
}));

import { Sidebar } from './Sidebar';

describe('Sidebar', () => {
  beforeEach(() => pathname.mockReturnValue('/dashboard'));

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
    expect(screen.getByRole('link', { name: 'Recurrencias' })).toHaveAttribute(
      'href',
      '/recurrences',
    );
    expect(screen.getByRole('link', { name: 'Obligaciones' })).toHaveAttribute(
      'href',
      '/obligations',
    );

    expect(screen.getByRole('link', { name: 'Presupuestos' })).toHaveAttribute('href', '/budgets');

    for (const label of ['Metas', 'Configuración']) {
      expect(screen.getByLabelText(label)).toHaveAttribute('aria-disabled', 'true');
      expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument();
    }
  });

  it('proporciona nombres y títulos accesibles en los enlaces habilitados', () => {
    render(<Sidebar />);

    for (const label of ['Dashboard', 'Cuentas', 'Categorías', 'Movimientos', 'Recurrencias', 'Obligaciones']) {
      const link = screen.getByRole('link', { name: label });
      expect(link).toHaveAttribute('aria-label', label);
      expect(link).toHaveAttribute('title', label);
    }
  });

  it('marca como deshabilitados los elementos aún no disponibles', () => {
    render(<Sidebar />);

    for (const label of ['Metas', 'Configuración']) {
      const item = screen.getByLabelText(label);
      expect(item).toHaveAttribute('aria-disabled', 'true');
      expect(item).toHaveAttribute('title', 'Próximamente');
    }
  });

  it('marca Presupuestos como activo en /budgets', () => {
    pathname.mockReturnValue('/budgets');
    render(<Sidebar />);

    expect(screen.getByRole('link', { name: 'Presupuestos' })).toHaveAttribute('href', '/budgets');
    expect(screen.getByRole('link', { name: 'Presupuestos' })).toHaveAttribute('aria-current', 'page');
  });
});
