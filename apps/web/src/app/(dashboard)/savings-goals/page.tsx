'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { ContributionsList } from '@/components/savings-goals/ContributionsList';
import { GoalContributionModal } from '@/components/savings-goals/GoalContributionModal';
import { SavingsGoalCard } from '@/components/savings-goals/SavingsGoalCard';
import { SavingsGoalFilters } from '@/components/savings-goals/SavingsGoalFilters';
import { SavingsGoalFormModal } from '@/components/savings-goals/SavingsGoalFormModal';
import { Button } from '@/components/ui/button';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import {
  useCreateContribution,
  useCreateSavingsGoal,
  useDeleteSavingsGoal,
  useRestoreSavingsGoal,
  useSavingsGoals,
  useUpdateSavingsGoal,
} from '@/hooks/useSavingsGoals';
import { ApiError } from '@/lib/api-client';
import type {
  CreateGoalContributionInput,
  CreateSavingsGoalInput,
  SavingsGoal,
  SavingsGoalFilters as Filters,
  UpdateSavingsGoalInput,
} from '@/types/savings-goal';

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError || error instanceof Error ? error.message : fallback;
}

export default function SavingsGoalsPage() {
  const [filters, setFilters] = useState<Filters>({ page: 1, limit: 20 });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [contributionGoal, setContributionGoal] = useState<SavingsGoal | null>(null);
  const [contributionsGoal, setContributionsGoal] = useState<SavingsGoal | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SavingsGoal | null>(null);
  const [notice, setNotice] = useState<{ message: string; isError: boolean } | null>(null);

  const goalsQuery = useSavingsGoals(filters);
  const createGoal = useCreateSavingsGoal();
  const updateGoal = useUpdateSavingsGoal();
  const deleteGoal = useDeleteSavingsGoal();
  const restoreGoal = useRestoreSavingsGoal();
  const createContribution = useCreateContribution(contributionGoal?.id ?? '');
  const goals = goalsQuery.data?.data ?? [];
  const meta = goalsQuery.data?.meta;
  const filteredGoals = filters.status
    ? goals.filter((goal) => goal.status === filters.status)
    : goals;

  const handleCreate = async (input: CreateSavingsGoalInput) => {
    await createGoal.mutateAsync(input);
    setFilters((current) => ({ ...current, page: 1 }));
    setNotice({ message: 'Meta creada.', isError: false });
  };

  const handleEdit = async (input: UpdateSavingsGoalInput) => {
    if (!editing) return;
    await updateGoal.mutateAsync({ id: editing.id, input });
    setNotice({ message: 'Meta actualizada.', isError: false });
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteGoal.mutateAsync(pendingDelete.id);
      setNotice({ message: 'Meta eliminada.', isError: false });
      setPendingDelete(null);
    } catch (error) {
      setNotice({
        message: getErrorMessage(error, 'No se pudo eliminar la meta.'),
        isError: true,
      });
    }
  };

  const handleRestore = async (goal: SavingsGoal) => {
    try {
      await restoreGoal.mutateAsync(goal.id);
      setNotice({ message: 'Meta restaurada.', isError: false });
    } catch (error) {
      setNotice({
        message: getErrorMessage(error, 'No se pudo restaurar la meta.'),
        isError: true,
      });
    }
  };

  const handleCreateContribution = async (input: CreateGoalContributionInput) => {
    await createContribution.mutateAsync(input);
    setNotice({ message: 'Aporte registrado.', isError: false });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Metas de ahorro</h1>
          <p className="text-sm text-muted-foreground">
            Define objetivos y sigue tu progreso de ahorro.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus aria-hidden="true" className="mr-2 h-4 w-4" />
          Nueva meta
        </Button>
      </div>

      {notice && (
        <p
          role={notice.isError ? 'alert' : 'status'}
          className={`rounded-md p-3 text-sm ${
            notice.isError
              ? 'bg-destructive/10 text-destructive'
              : 'bg-primary/10 text-primary'
          }`}
        >
          {notice.message}
        </p>
      )}

      <SavingsGoalFilters
        filters={filters}
        onChange={setFilters}
        onReset={() => setFilters({ page: 1, limit: 20 })}
      />

      {goalsQuery.isPending && (
        <p role="status" className="text-sm text-muted-foreground">
          Cargando metas...
        </p>
      )}
      {goalsQuery.isError && (
        <p role="alert" className="text-sm text-destructive">
          {getErrorMessage(goalsQuery.error, 'No se pudieron cargar las metas.')}
        </p>
      )}
      {!goalsQuery.isPending && !goalsQuery.isError && (
        filteredGoals.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay metas de ahorro. Crea la primera.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredGoals.map((goal) => (
              <SavingsGoalCard
                key={goal.id}
                goal={goal}
                onContribute={setContributionGoal}
                onEdit={(selectedGoal) => {
                  setEditing(selectedGoal);
                  setFormOpen(true);
                }}
                onDelete={setPendingDelete}
                onRestore={(selectedGoal) => void handleRestore(selectedGoal)}
                onViewContributions={setContributionsGoal}
              />
            ))}
          </div>
        )
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setFilters((current) => ({ ...current, page: Math.max(1, (current.page ?? 1) - 1) }))}
            disabled={(filters.page ?? meta.page) <= 1 || goalsQuery.isFetching}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {meta.page} de {meta.totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setFilters((current) => ({
                ...current,
                page: Math.min(meta.totalPages, (current.page ?? meta.page) + 1),
              }))
            }
            disabled={(filters.page ?? meta.page) >= meta.totalPages || goalsQuery.isFetching}
          >
            Siguiente
          </Button>
        </div>
      )}

      <SavingsGoalFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmitCreate={handleCreate}
        onSubmitEdit={handleEdit}
        editing={editing}
      />

      <GoalContributionModal
        open={Boolean(contributionGoal)}
        onClose={() => setContributionGoal(null)}
        onSubmit={handleCreateContribution}
        goal={contributionGoal}
      />

      <ContributionsList
        open={Boolean(contributionsGoal)}
        onClose={() => setContributionsGoal(null)}
        goal={contributionsGoal}
      />

      <ConfirmationModal
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && !deleteGoal.isPending && setPendingDelete(null)}
        title="Eliminar meta"
        description={pendingDelete
          ? `¿Eliminar «${pendingDelete.name}»? Se podrá restaurar después.`
          : ''}
        confirmLabel="Eliminar"
        variant="destructive"
        isLoading={deleteGoal.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
