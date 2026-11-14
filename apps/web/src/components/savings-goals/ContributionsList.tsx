'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useContributions,
  useDeleteContribution,
  useRestoreContribution,
} from '@/hooks/useSavingsGoals';
import { ApiError } from '@/lib/api-client';
import { formatCurrency } from '@/lib/format-currency';
import type { GoalContribution, SavingsGoal } from '@/types/savings-goal';

interface Props {
  open: boolean;
  onClose: () => void;
  goal: SavingsGoal | null;
}

export function ContributionsList({ open, onClose, goal }: Props) {
  const goalId = goal?.id ?? '';
  const contributionsQuery = useContributions(goalId);
  const deleteContribution = useDeleteContribution(goalId);
  const restoreContribution = useRestoreContribution(goalId);
  const [lastDeleted, setLastDeleted] = useState<GoalContribution | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setLastDeleted(null);
      setError(null);
      return;
    }
    if (!lastDeleted) return;
    const timer = window.setTimeout(() => setLastDeleted(null), 5000);
    return () => window.clearTimeout(timer);
  }, [open, lastDeleted]);

  const handleClose = () => {
    setLastDeleted(null);
    setError(null);
    onClose();
  };

  const handleDelete = async (contribution: GoalContribution) => {
    try {
      setError(null);
      await deleteContribution.mutateAsync(contribution.id);
      setLastDeleted(contribution);
    } catch (cause) {
      setError(cause instanceof ApiError || cause instanceof Error
        ? cause.message
        : 'No se pudo eliminar el aporte.');
    }
  };

  const handleRestore = async () => {
    if (!lastDeleted) return;
    try {
      setError(null);
      await restoreContribution.mutateAsync(lastDeleted.id);
      setLastDeleted(null);
    } catch (cause) {
      setError(cause instanceof ApiError || cause instanceof Error
        ? cause.message
        : 'No se pudo restaurar el aporte.');
    }
  };

  const contributions = contributionsQuery.data ?? [];

  return (
    <Dialog open={open} onOpenChange={(value) => !value && handleClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Aportes{goal ? ` · ${goal.name}` : ''}</DialogTitle>
        </DialogHeader>
        {lastDeleted && (
          <div role="status" className="flex items-center justify-between rounded-md bg-primary/10 p-3 text-sm">
            <span>Aporte eliminado.</span>
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => void handleRestore()}
              disabled={restoreContribution.isPending}
            >
              Deshacer
            </Button>
          </div>
        )}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {contributionsQuery.isPending && (
          <p role="status" className="text-sm text-muted-foreground">Cargando aportes...</p>
        )}
        {contributionsQuery.isError && (
          <p role="alert" className="text-sm text-destructive">
            {contributionsQuery.error instanceof Error
              ? contributionsQuery.error.message
              : 'No se pudieron cargar los aportes.'}
          </p>
        )}
        {!contributionsQuery.isPending && !contributionsQuery.isError && contributions.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">Aún no hay aportes.</p>
        )}
        {!contributionsQuery.isPending && !contributionsQuery.isError && contributions.length > 0 && (
          <ul className="divide-y divide-border">
            {contributions.map((contribution) => (
              <li key={contribution.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium">
                    {contribution.type === 'DEPOSIT' ? 'Depósito' : 'Retiro'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(contribution.date).toLocaleDateString('es-PE', {
                      timeZone: 'America/Lima',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{formatCurrency(contribution.amount)}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Eliminar aporte"
                    onClick={() => void handleDelete(contribution)}
                    disabled={deleteContribution.isPending}
                  >
                    Eliminar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={handleClose}>Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
