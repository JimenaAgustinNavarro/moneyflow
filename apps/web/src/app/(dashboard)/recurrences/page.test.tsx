import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const recurrenceHooks = vi.hoisted(() => ({
  useRecurrences: vi.fn(), useCreateRecurrence: vi.fn(), useUpdateRecurrence: vi.fn(),
  useDeleteRecurrence: vi.fn(), useRestoreRecurrence: vi.fn(), useToggleRecurrence: vi.fn(),
}));
vi.mock('@/hooks/useRecurrences', () => recurrenceHooks);
vi.mock('@/hooks/useAccounts', () => ({ useAccounts: () => ({ data: [], isError: false }) }));
vi.mock('@/hooks/useCategories', () => ({ useCategories: () => ({ data: [], isError: false }) }));
vi.mock('@/components/recurrences/RecurrenceFilters', () => ({
  RecurrenceFilters: () => <div>Filtros de recurrencias</div>,
}));
vi.mock('@/components/recurrences/RecurrenceFormModal', () => ({
  RecurrenceFormModal: () => null,
}));
vi.mock('@/components/recurrences/RecurrenceList', () => ({
  RecurrenceList: ({ recurrences }: { recurrences: { name: string }[] }) => (
    <div>{recurrences.map((item) => item.name).join(',') || 'Lista vacía'}</div>
  ),
}));

import RecurrencesPage from './page';

const mutation = () => ({ mutateAsync: vi.fn().mockResolvedValue(undefined) });

describe('RecurrencesPage', () => {
  beforeEach(() => {
    recurrenceHooks.useRecurrences.mockReset();
    recurrenceHooks.useCreateRecurrence.mockReturnValue(mutation());
    recurrenceHooks.useUpdateRecurrence.mockReturnValue(mutation());
    recurrenceHooks.useDeleteRecurrence.mockReturnValue(mutation());
    recurrenceHooks.useRestoreRecurrence.mockReturnValue(mutation());
    recurrenceHooks.useToggleRecurrence.mockReturnValue(mutation());
  });

  it('muestra carga', () => {
    recurrenceHooks.useRecurrences.mockReturnValue({ isPending: true, isError: false, data: undefined });
    render(<RecurrencesPage />);
    expect(screen.getByText('Cargando recurrencias...')).toBeInTheDocument();
  });

  it('muestra error', () => {
    recurrenceHooks.useRecurrences.mockReturnValue({ isPending: false, isError: true, error: new Error('Error de recurrencias') });
    render(<RecurrencesPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('Error de recurrencias');
  });

  it('muestra estado vacío', () => {
    recurrenceHooks.useRecurrences.mockReturnValue({ isPending: false, isError: false, data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } } });
    render(<RecurrencesPage />);
    expect(screen.getByText('Lista vacía')).toBeInTheDocument();
  });

  it('muestra recurrencias', () => {
    recurrenceHooks.useRecurrences.mockReturnValue({ isPending: false, isError: false, data: { data: [{ name: 'Alquiler' }], meta: { page: 1, limit: 20, total: 21, totalPages: 2 } } });
    render(<RecurrencesPage />);
    expect(screen.getByRole('heading', { name: 'Recurrencias' })).toBeInTheDocument();
    expect(screen.getByText('Alquiler')).toBeInTheDocument();
  });
});
