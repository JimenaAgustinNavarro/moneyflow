import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { UpcomingPayment } from '@/types/dashboard';
import { UpcomingPayments } from './UpcomingPayments';

const payment = (id: string, status: UpcomingPayment['status'] = 'PENDING'): UpcomingPayment => ({
  id,
  name: `Pago ${id}`,
  amount: '100.00',
  currency: 'PEN',
  dueDate: '2026-11-01T00:00:00-05:00',
  status,
  accountName: 'Principal',
  categoryName: 'Servicios',
});

describe('UpcomingPayments', () => {
  it('renderiza pagos, badges y el enlace', () => {
    render(<UpcomingPayments payments={[payment('1'), payment('2', 'PARTIALLY_PAID')]} isLoading={false} />);
    expect(screen.getByText('Pago 1')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText('Parcial')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver todas' })).toHaveAttribute('href', '/obligations');
  });

  it('limita defensivamente la lista a cinco pagos', () => {
    render(<UpcomingPayments payments={Array.from({ length: 7 }, (_, index) => payment(String(index + 1)))} isLoading={false} />);
    expect(screen.queryByText('Pago 6')).not.toBeInTheDocument();
  });

  it('muestra loading y estado vacío', () => {
    const { rerender } = render(<UpcomingPayments payments={[]} isLoading />);
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
    rerender(<UpcomingPayments payments={[]} isLoading={false} />);
    expect(screen.getByText(/Sin obligaciones pendientes/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Crear una' })).toHaveAttribute('href', '/obligations');
  });
});
