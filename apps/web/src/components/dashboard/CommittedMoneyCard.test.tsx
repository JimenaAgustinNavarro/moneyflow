import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CommittedMoneyCard } from './CommittedMoneyCard';

describe('CommittedMoneyCard', () => {
  it('renderiza el valor comprometido y el enlace', () => {
    render(<CommittedMoneyCard committedMoney="1500.00" isLoading={false} />);
    expect(screen.getByText('Comprometido')).toBeInTheDocument();
    expect(screen.getByText(/1[,.]?500\.00/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver todas' })).toHaveAttribute('href', '/obligations');
  });

  it('muestra el esqueleto durante la carga', () => {
    const { container } = render(<CommittedMoneyCard committedMoney={undefined} isLoading />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('usa color neutro para cero y ámbar para un importe pendiente', () => {
    const { rerender } = render(<CommittedMoneyCard committedMoney="0.00" isLoading={false} />);
    expect(screen.getByText(/0\.00/)).toHaveClass('text-foreground');
    rerender(<CommittedMoneyCard committedMoney="1500.00" isLoading={false} />);
    expect(screen.getByText(/1[,.]?500\.00/)).toHaveClass('text-amber-600');
  });
});
