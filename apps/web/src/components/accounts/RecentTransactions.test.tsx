import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RecentTransactions } from './RecentTransactions';

describe('RecentTransactions', () => {
  it('muestra el placeholder hasta que exista la sección de movimientos', () => {
    render(<RecentTransactions />);

    expect(
      screen.getByText(
        'Los movimientos recientes estarán disponibles cuando se habilite la sección Movimientos.',
      ),
    ).toBeInTheDocument();
  });
});
