import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const obligationHooks = vi.hoisted(() => ({ useObligations: vi.fn(), useCreateObligation: vi.fn(), useUpdateObligation: vi.fn(), useDeleteObligation: vi.fn(), useRestoreObligation: vi.fn(), usePayObligation: vi.fn(), useGenerateObligations: vi.fn() }));
vi.mock('@/hooks/useObligations', () => obligationHooks);
vi.mock('@/hooks/useAccounts', () => ({ useAccounts: () => ({ data: [], isPending: false }) }));
vi.mock('@/hooks/useCategories', () => ({ useCategories: () => ({ data: [], isPending: false }) }));
vi.mock('@/components/obligations/ObligationFilters', () => ({ ObligationFilters: () => <div>Filtros de obligaciones</div> }));
vi.mock('@/components/obligations/ObligationFormModal', () => ({ ObligationFormModal: () => null }));
vi.mock('@/components/obligations/PayObligationModal', () => ({ PayObligationModal: () => null }));
vi.mock('@/components/obligations/ObligationList', () => ({ ObligationList: ({ obligations }: { obligations: { name: string }[] }) => <div>{obligations.map((item) => item.name).join(',') || 'Lista vacía'}</div> }));
import ObligationsPage from './page';
const mutation = () => ({ mutateAsync: vi.fn().mockResolvedValue({ data: { generated: 0, skipped: 0 } }), isPending: false });
describe('ObligationsPage', () => {
  beforeEach(() => { obligationHooks.useCreateObligation.mockReturnValue(mutation()); obligationHooks.useUpdateObligation.mockReturnValue(mutation()); obligationHooks.useDeleteObligation.mockReturnValue(mutation()); obligationHooks.useRestoreObligation.mockReturnValue(mutation()); obligationHooks.usePayObligation.mockReturnValue(mutation()); obligationHooks.useGenerateObligations.mockReturnValue(mutation()); });
  it('muestra carga', () => { obligationHooks.useObligations.mockReturnValue({ isPending: true, isError: false, data: undefined }); render(<ObligationsPage />); expect(screen.getByText('Cargando obligaciones...')).toBeInTheDocument(); });
  it('muestra error', () => { obligationHooks.useObligations.mockReturnValue({ isPending: false, isError: true, error: new Error('Error de obligaciones'), data: undefined }); render(<ObligationsPage />); expect(screen.getByRole('alert')).toHaveTextContent('Error de obligaciones'); });
  it('muestra vacío y lista', () => { obligationHooks.useObligations.mockReturnValue({ isPending: false, isError: false, data: { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } } }); const { rerender } = render(<ObligationsPage />); expect(screen.getByText('Lista vacía')).toBeInTheDocument(); obligationHooks.useObligations.mockReturnValue({ isPending: false, isError: false, data: { data: [{ name: 'Luz' }], meta: { page: 1, limit: 20, total: 21, totalPages: 2 } } }); rerender(<ObligationsPage />); expect(screen.getByText('Luz')).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled(); expect(screen.getByText('Página 1 de 2')).toBeInTheDocument(); });
});
