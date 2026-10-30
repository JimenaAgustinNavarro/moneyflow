'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api-client';
import type { Budget, CopyBudgetInput } from '@/types/budget';

const schema = z.object({
  name: z.string().max(255).optional(),
  startDate: z.string().min(1),
  endDate: z.string().optional().nullable(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CopyBudgetInput) => Promise<void>;
  budget: Budget | null;
}

export function CopyBudgetModal({ open, onClose, onSubmit, budget }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', startDate: '', endDate: null },
  });

  useEffect(() => {
    if (!open || !budget) return;
    const end = budget.endDate ? new Date(budget.endDate) : new Date();
    const nextStart = new Date(end);
    nextStart.setDate(nextStart.getDate() + 1);
    let nextEnd: Date | null = null;
    if (budget.endDate) {
      nextEnd = new Date(end);
      nextEnd.setDate(nextEnd.getDate() + 1);
      if (budget.periodType === 'MONTHLY') nextEnd.setMonth(nextEnd.getMonth() + 1);
      else if (budget.periodType === 'WEEKLY') nextEnd.setDate(nextEnd.getDate() + 7);
      else if (budget.periodType === 'QUARTERLY') nextEnd.setMonth(nextEnd.getMonth() + 3);
      else if (budget.periodType === 'YEARLY') nextEnd.setFullYear(nextEnd.getFullYear() + 1);
      nextEnd.setDate(nextEnd.getDate() - 1);
    }
    form.reset({
      name: `${budget.name} (copia)`,
      startDate: nextStart.toISOString().slice(0, 10),
      endDate: nextEnd ? nextEnd.toISOString().slice(0, 10) : null,
    });
    setServerError(null);
  }, [open, budget, form]);

  const handleSubmit = form.handleSubmit(async (data) => {
    setIsSubmitting(true);
    setServerError(null);
    try {
      await onSubmit({
        name: data.name,
        startDate: `${data.startDate}T00:00:00-05:00`,
        endDate: data.endDate ? `${data.endDate}T00:00:00-05:00` : null,
      });
      onClose();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Error inesperado');
    } finally {
      setIsSubmitting(false);
    }
  });

  if (!budget) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicar: {budget.name}</DialogTitle>
        </DialogHeader>
        {serverError && (
          <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {serverError}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="name">Nombre (opcional)</Label>
            <Input id="name" {...form.register('name')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="startDate">Inicio</Label>
              <Input id="startDate" type="date" {...form.register('startDate')} />
            </div>
            <div>
              <Label htmlFor="endDate">Fin (opcional)</Label>
              <Input id="endDate" type="date" {...form.register('endDate')} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Duplicando...' : 'Duplicar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
