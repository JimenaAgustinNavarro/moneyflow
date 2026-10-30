'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { useCategories } from '@/hooks/useCategories';
import {
  useBudgets, useCopyBudget, useCreateBudget, useDeleteBudget,
  useRestoreBudget, useUpdateBudget,
} from '@/hooks/useBudgets';
import { BudgetGrid } from '@/components/budgets/BudgetGrid';
import { BudgetFilters } from '@/components/budgets/BudgetFilters';
import { BudgetFormModal } from '@/components/budgets/BudgetFormModal';
import { CopyBudgetModal } from '@/components/budgets/CopyBudgetModal';
import { ApiError } from '@/lib/api-client';
import type {
  Budget, BudgetFilters as Filters, CopyBudgetInput,
  CreateBudgetInput, UpdateBudgetInput,
} from '@/types/budget';

export default function BudgetsPage() {
  const [filters, setFilters] = useState<Filters>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [copying, setCopying] = useState<Budget | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Budget | null>(null);
  const [notice, setNotice] = useState<{ msg: string; isError: boolean } | null>(null);

  const categoriesQuery = useCategories();
  const budgetsQuery = useBudgets(filters);
  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();
  const deleteBudget = useDeleteBudget();
  const restoreBudget = useRestoreBudget();
  const copyBudget = useCopyBudget();

  const categories = categoriesQuery.data ?? [];
  const list = budgetsQuery.data ?? [];

  const handleCreate = async (input: CreateBudgetInput) => {
    await createBudget.mutateAsync(input);
    setNotice({ msg: 'Presupuesto creado.', isError: false });
  };

  const handleEdit = async (input: UpdateBudgetInput) => {
    if (!editing) return;
    await updateBudget.mutateAsync({ id: editing.id, input });
    setNotice({ msg: 'Presupuesto actualizado.', isError: false });
  };

  const handleCopy = async (input: CopyBudgetInput) => {
    if (!copying) return;
    await copyBudget.mutateAsync({ id: copying.id, input });
    setNotice({ msg: 'Presupuesto duplicado.', isError: false });
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteBudget.mutateAsync(pendingDelete.id);
      setNotice({ msg: 'Presupuesto eliminado.', isError: false });
    } catch (err) {
      setNotice({ msg: err instanceof ApiError ? err.message : 'Error', isError: true });
    } finally {
      setPendingDelete(null);
    }
  };

  const handleRestore = async (b: Budget) => {
    try {
      await restoreBudget.mutateAsync(b.id);
      setNotice({ msg: 'Presupuesto restaurado.', isError: false });
    } catch (err) {
      setNotice({ msg: err instanceof ApiError ? err.message : 'Error', isError: true });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Presupuestos</h1>
          <p className="text-sm text-muted-foreground">Controla tu gasto por categorías.</p>
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo presupuesto
        </Button>
      </div>

      {notice && (
        <div
          role="status"
          className={`rounded-md p-3 text-sm ${
            notice.isError ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
          }`}
        >
          {notice.msg}
        </div>
      )}

      <BudgetFilters filters={filters} onChange={setFilters} onReset={() => setFilters({})} />

      {budgetsQuery.isLoading && (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      )}
      {budgetsQuery.error && (
        <p role="alert" className="text-sm text-destructive">
          {budgetsQuery.error instanceof Error
            ? budgetsQuery.error.message
            : 'Error al cargar.'}
        </p>
      )}

      {!budgetsQuery.isLoading && !budgetsQuery.error && (
        <BudgetGrid
          budgets={list}
          onEdit={(b) => { setEditing(b); setModalOpen(true); }}
          onCopy={setCopying}
          onDelete={setPendingDelete}
          onRestore={handleRestore}
        />
      )}

      <BudgetFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSubmitCreate={handleCreate}
        onSubmitEdit={handleEdit}
        categories={categories}
        editing={editing}
      />

      <CopyBudgetModal
        open={Boolean(copying)}
        onClose={() => setCopying(null)}
        onSubmit={handleCopy}
        budget={copying}
      />

      <ConfirmationModal
        open={Boolean(pendingDelete)}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title="Eliminar presupuesto"
        description={`¿Seguro que quieres eliminar "${pendingDelete?.name ?? ''}"? Se puede restaurar.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleDelete}
        variant="destructive"
        isLoading={deleteBudget.isPending}
      />
    </div>
  );
}
