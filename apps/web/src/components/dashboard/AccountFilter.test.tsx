import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useAccounts: vi.fn(),
}));

vi.mock('@/hooks/useAccounts', () => ({
  useAccounts: mocks.useAccounts,
}));

import { AccountFilter } from './AccountFilter';

Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
  configurable: true,
  value: () => false,
});
Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
  configurable: true,
  value: () => undefined,
});
Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
  configurable: true,
  value: () => undefined,
});

const accounts = [
  { id: 'account-1', name: 'Cuenta principal' },
  { id: 'account-2', name: 'Ahorros' },
];

function renderFilter(
  props: { value?: string; onChange?: (accountId: string | undefined) => void } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AccountFilter value={props.value} onChange={props.onChange ?? vi.fn()} />
    </QueryClientProvider>,
  );
}

describe('AccountFilter', () => {
  beforeEach(() => {
    mocks.useAccounts.mockReset();
    mocks.useAccounts.mockReturnValue({ data: accounts, isLoading: false, error: null });
  });

  it('muestra Todas las cuentas como opción inicial', () => {
    renderFilter();

    expect(screen.getByRole('combobox', { name: 'Cuenta' })).toHaveTextContent(
      'Todas las cuentas',
    );
  });

  it('incluye las cuentas activas obtenidas por el hook', async () => {
    const user = userEvent.setup();
    renderFilter();

    await user.click(screen.getByRole('combobox', { name: 'Cuenta' }));

    expect(await screen.findByRole('option', { name: 'Cuenta principal' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Ahorros' })).toBeInTheDocument();
    expect(mocks.useAccounts).toHaveBeenCalledWith(false);
  });

  it('notifica el UUID al seleccionar una cuenta', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderFilter({ onChange });

    await user.click(screen.getByRole('combobox', { name: 'Cuenta' }));
    await user.click(await screen.findByRole('option', { name: 'Cuenta principal' }));

    expect(onChange).toHaveBeenCalledWith('account-1');
  });

  it('notifica undefined al seleccionar Todas las cuentas', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderFilter({ value: 'account-1', onChange });

    await user.click(screen.getByRole('combobox', { name: 'Cuenta' }));
    await user.click(await screen.findByRole('option', { name: 'Todas las cuentas' }));

    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('deshabilita el selector mientras carga las cuentas', () => {
    mocks.useAccounts.mockReturnValue({ data: undefined, isLoading: true, error: null });
    renderFilter();

    expect(screen.getByRole('combobox', { name: 'Cuenta' })).toBeDisabled();
  });

  it('muestra un mensaje explícito si falla la carga de cuentas', () => {
    mocks.useAccounts.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Error de red'),
    });
    renderFilter();

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron cargar las cuentas.');
  });
});
