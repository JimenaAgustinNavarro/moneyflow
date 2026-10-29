import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { QuickActions } from './QuickActions';

describe('QuickActions', () => {
  it('renderiza cuatro links con sus rutas correspondientes', () => {
    render(<QuickActions />);

    const actions = [
      ['Nuevo movimiento', '/transactions'],
      ['Nueva transferencia', '/transactions'],
      ['Cuentas', '/accounts'],
      ['Categorías', '/categories'],
    ];

    expect(screen.getAllByRole('link')).toHaveLength(4);
    for (const [label, href] of actions) {
      expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', href);
    }
  });

  it('oculta los iconos a tecnologías de asistencia', () => {
    render(<QuickActions />);

    for (const link of screen.getAllByRole('link')) {
      expect(link.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    }
  });
});
