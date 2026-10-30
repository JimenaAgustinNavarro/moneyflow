'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

import { RecurrenceFilters } from '@/components/recurrences/RecurrenceFilters';
import { RecurrenceFormModal } from '@/components/recurrences/RecurrenceFormModal';
import { RecurrenceList } from '@/components/recurrences/RecurrenceList';
import { Button } from '@/components/ui/button';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import {
  useCreateRecurrence,
  useDeleteRecurrence,
  useRecurrences,
  useRestoreRecurrence,
  useToggleRecurrence,
  useUpdateRecurrence,
} from '@/hooks/useRecurrences';
import { ApiError } from '@/lib/api-client';
import type {
  CreateRecurrenceInput,
  Recurrence,
  RecurrenceFilters as Filters,
  UpdateRecurrenceInput,
} from '@/types/recurrence';

export default function RecurrencesPage() {
  const [filters, setFilters] = useState<Filters>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Recurrence | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Recurrence | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notice, setNotice] = useState<{ message: string; isError: boolean } | null>(null);

  const accountsQuery = useAccounts(false);
  const categoriesQuery = useCategories();
  const recurrencesQuery = useRecurrences(filters);
  const createRecurrence = useCreateRecurrence();
  const updateRecurrence = useUpdateRecurrence();
  const deleteRecurrence = useDeleteRecurrence();
  const restoreRecurrence = useRestoreRecurrence();
  const toggleRecurrence = useToggleRecurrence();

  const accounts = accountsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const recurrences = recurrencesQuery.data?.data ?? [];

  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof ApiError || error instanceof Error ? error.message : fallback;

  const handleCreate = async (input: CreateRecurrenceInput) => {
    await createRecurrence.mutateAsync(input);
    setNotice({ message: 'Recurrencia creada.', isError: false });
  };

  const handleEdit = async (input: UpdateRecurrenceInput) => {
    if (!editing) return;
    await updateRecurrence.mutateAsync({ id: editing.id, input });
    setNotice({ message: 'Recurrencia actualizada.', isError: false });
  };

  const handleToggle = async (recurrence: Recurrence) => {
    try {
      await toggleRecurrence.mutateAsync(recurrence.id);
      setNotice({
        message: recurrence.active ? 'Recurrencia desactivada.' : 'Recurrencia activada.',
        isError: false,
      });
    } catch (error) {
      setNotice({
        message: getErrorMessage(error, 'No se pudo cambiar el estado de la recurrencia.'),
        isError: true,
      });
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    try {
      await deleteRecurrence.mutateAsync(pendingDelete.id);
      setNotice({ message: 'Recurrencia eliminada.', isError: false });
      setPendingDelete(null);
    } catch (error) {
      setNotice({ message: getErrorMessage(error, 'No se pudo eliminar la recurrencia.'), isError: true });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestore = async (recurrence: Recurrence) => {
    try {
      await restoreRecurrence.mutateAsync(recurrence.id);
      setNotice({ message: 'Recurrencia restaurada.', isError: false });
    } catch (error) {
      setNotice({ message: getErrorMessage(error, 'No se pudo restaurar la recurrencia.'), isError: true });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Recurrencias</h1>
          <p className="text-sm text-muted-foreground">Gestiona tus ingresos y egresos periódicos.</p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus aria-hidden="true" className="mr-2 h-4 w-4" />
          Nueva recurrencia
        </Button>
      </div>

      {notice && (
        <p
          role={notice.isError ? 'alert' : 'status'}
          className={`rounded-md p-3 text-sm ${notice.isError ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}
        >
          {notice.message}
        </p>
      )}

      {(accountsQuery.isError || categoriesQuery.isError) && (
        <p role="alert" className="text-sm text-destructive">
          No se pudieron cargar las cuentas o categorías.
        </p>
      )}

      <RecurrenceFilters
        filters={filters}
        accounts={accounts}
        categories={categories}
        onChange={setFilters}
        onReset={() => setFilters({})}
      />

      {recurrencesQuery.isPending && (
        <p role="status" className="text-sm text-muted-foreground">Cargando recurrencias...</p>
      )}
      {recurrencesQuery.isError && (
        <p role="alert" className="text-sm text-destructive">
          {getErrorMessage(recurrencesQuery.error, 'No se pudieron cargar las recurrencias.')}
        </p>
      )}
      {!recurrencesQuery.isPending && !recurrencesQuery.isError && (
        <RecurrenceList
          recurrences={recurrences}
          onEdit={(recurrence) => {
            setEditing(recurrence);
            setModalOpen(true);
          }}
          onToggle={(recurrence) => void handleToggle(recurrence)}
          onDelete={setPendingDelete}
          onRestore={(recurrence) => void handleRestore(recurrence)}
        />
      )}

      <RecurrenceFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmitCreate={handleCreate}
        onSubmitEdit={handleEdit}
        accounts={accounts}
        categories={categories}
        editing={editing}
      />

      <ConfirmationModal
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && !isDeleting && setPendingDelete(null)}
        title="Eliminar recurrencia"
        description={pendingDelete ? `¿Eliminar «${pendingDelete.name}»?` : ''}
        confirmLabel="Eliminar"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
