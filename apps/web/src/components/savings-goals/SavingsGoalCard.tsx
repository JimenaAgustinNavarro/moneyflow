'use client';

import { CheckCircle2, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format-currency';
import type { SavingsGoal, SavingsGoalStatus } from '@/types/savings-goal';

const STATUS_LABELS: Record<SavingsGoalStatus, string> = {
  ACTIVE: 'Activa',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

const STATUS_BADGES: Record<SavingsGoalStatus, string> = {
  ACTIVE: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  CANCELLED: 'bg-muted text-muted-foreground',
};

function barColor(percentage: number): string {
  if (percentage > 100) return 'bg-rose-500';
  if (percentage >= 80) return 'bg-yellow-500';
  return 'bg-emerald-500';
}

interface Props {
  goal: SavingsGoal;
  onContribute: (goal: SavingsGoal) => void;
  onEdit: (goal: SavingsGoal) => void;
  onDelete: (goal: SavingsGoal) => void;
  onRestore: (goal: SavingsGoal) => void;
  onViewContributions: (goal: SavingsGoal) => void;
}

export function SavingsGoalCard({
  goal,
  onContribute,
  onEdit,
  onDelete,
  onRestore,
  onViewContributions,
}: Props) {
  const deleted = Boolean(goal.deletedAt);
  const barWidth = Math.min(Math.max(goal.percentage, 0), 100);

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base">{goal.name}</CardTitle>
          {goal.targetDate && (
            <p className="mt-1 text-xs text-muted-foreground">
              Objetivo:{' '}
              {new Date(`${goal.targetDate}T00:00:00Z`).toLocaleDateString('es-PE', {
                timeZone: 'UTC',
              })}
            </p>
          )}
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGES[goal.status]}`}>
          {goal.status === 'COMPLETED' && (
            <CheckCircle2 aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />
          )}
          {STATUS_LABELS[goal.status]}
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-xl font-semibold text-foreground">
            {formatCurrency(goal.currentAmount)}
          </span>
          <span className="text-xs text-muted-foreground">
            de {formatCurrency(goal.targetAmount)}
          </span>
        </div>

        <div className="space-y-1">
          <div
            role="progressbar"
            aria-label={`Progreso de ${goal.name}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={goal.percentage}
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
          >
            <div
              className={`h-full ${barColor(goal.percentage)} transition-all`}
              style={{ width: `${barWidth}%` }}
            />
          </div>
          <p className="text-right text-xs text-muted-foreground">
            {goal.percentage.toFixed(1)}%
          </p>
        </div>

        {deleted && (
          <p className="text-xs text-destructive">Meta eliminada</p>
        )}
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onViewContributions(goal)}
            disabled={deleted}
          >
            Ver aportes
          </Button>
          <div className="flex gap-1">
            {deleted ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onRestore(goal)}
                aria-label="Restaurar"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onContribute(goal)}
                  aria-label="Aportar"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(goal)}
                  aria-label="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(goal)}
                  aria-label="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
