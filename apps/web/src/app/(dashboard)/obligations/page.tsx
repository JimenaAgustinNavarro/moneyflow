'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import { useCreateObligation, useDeleteObligation, useGenerateObligations, useObligations, usePayObligation, useRestoreObligation, useUpdateObligation } from '@/hooks/useObligations';
import { ObligationList } from '@/components/obligations/ObligationList';
import { ObligationFilters } from '@/components/obligations/ObligationFilters';
import { ObligationFormModal } from '@/components/obligations/ObligationFormModal';
import { PayObligationModal } from '@/components/obligations/PayObligationModal';
import { GenerateButton } from '@/components/obligations/GenerateButton';
import { ApiError } from '@/lib/api-client';
import type { CreateObligationInput, Obligation, ObligationFilters as Filters, PayObligationInput, UpdateObligationInput } from '@/types/obligation';

export default function ObligationsPage() {
  const [filters, setFilters] = useState<Filters>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Obligation | null>(null);
  const [paying, setPaying] = useState<Obligation | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Obligation | null>(null);
  const [notice, setNotice] = useState<{ msg: string; isError: boolean } | null>(null);
  const accountsQuery = useAccounts(false);
  const categoriesQuery = useCategories();
  const obligationsQuery = useObligations(filters);
  const createObl = useCreateObligation();
  const updateObl = useUpdateObligation();
  const deleteObl = useDeleteObligation();
  const restoreObl = useRestoreObligation();
  const payObl = usePayObligation();
  const generate = useGenerateObligations();
  const accounts = accountsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];

  const handleCreate = async (input: CreateObligationInput) => { await createObl.mutateAsync(input); setNotice({ msg: 'Obligación creada.', isError: false }); };
  const handleEdit = async (input: UpdateObligationInput) => { if (!editing) return; await updateObl.mutateAsync({ id: editing.id, input }); setNotice({ msg: 'Obligación actualizada.', isError: false }); };
  const handlePay = async (input: PayObligationInput) => { if (!paying) return; await payObl.mutateAsync({ id: paying.id, input }); setNotice({ msg: 'Pago registrado.', isError: false }); };
  const handleDelete = async () => { if (!pendingDelete) return; try { await deleteObl.mutateAsync(pendingDelete.id); setNotice({ msg: 'Obligación cancelada.', isError: false }); } catch (error) { setNotice({ msg: error instanceof ApiError ? error.message : 'Error', isError: true }); } finally { setPendingDelete(null); } };
  const handleRestore = async (obligation: Obligation) => { try { await restoreObl.mutateAsync(obligation.id); setNotice({ msg: 'Obligación restaurada.', isError: false }); } catch (error) { setNotice({ msg: error instanceof ApiError ? error.message : 'Error', isError: true }); } };
  const handleGenerate = async () => { try { const response = await generate.mutateAsync(); setNotice({ msg: `Generadas: ${response.data.generated}, Omitidas: ${response.data.skipped}.`, isError: false }); } catch (error) { setNotice({ msg: error instanceof ApiError ? error.message : 'Error', isError: true }); } };
  const list = obligationsQuery.data?.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold text-foreground">Obligaciones</h1><p className="text-sm text-muted-foreground">Gestiona tus pagos pendientes.</p></div><div className="flex gap-2"><GenerateButton onClick={handleGenerate} isLoading={generate.isPending} /><Button onClick={() => { setEditing(null); setModalOpen(true); }}><Plus className="mr-2 h-4 w-4" />Nueva obligación</Button></div></div>
      {notice && <div role="status" className={`rounded-md p-3 text-sm ${notice.isError ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>{notice.msg}</div>}
      <ObligationFilters filters={filters} accounts={accounts} categories={categories} onChange={setFilters} onReset={() => setFilters({})} />
      {obligationsQuery.isPending && <p role="status" className="text-sm text-muted-foreground">Cargando obligaciones...</p>}
      {obligationsQuery.isError && <p role="alert" className="text-sm text-destructive">{obligationsQuery.error instanceof Error ? obligationsQuery.error.message : 'Error al cargar.'}</p>}
      {!obligationsQuery.isPending && !obligationsQuery.isError && <ObligationList obligations={list} onEdit={(obligation) => { setEditing(obligation); setModalOpen(true); }} onPay={setPaying} onDelete={setPendingDelete} onRestore={handleRestore} />}
      <ObligationFormModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} onSubmitCreate={handleCreate} onSubmitEdit={handleEdit} accounts={accounts} categories={categories} editing={editing} />
      <PayObligationModal open={Boolean(paying)} onClose={() => setPaying(null)} onSubmit={handlePay} accounts={accounts} obligation={paying} />
      <ConfirmationModal open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)} title="Cancelar obligación" description={`¿Seguro que quieres cancelar "${pendingDelete?.name ?? ''}"? Se puede restaurar.`} confirmLabel="Cancelar obligación" cancelLabel="Volver" onConfirm={handleDelete} variant="destructive" isLoading={deleteObl.isPending} />
    </div>
  );
}
