'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ApiError } from '@/lib/api-client';
import type { Category } from '@/types/category';
import type { Budget, CreateBudgetInput, UpdateBudgetInput } from '@/types/budget';

const schema = z.object({
  name: z.string().min(1, 'Nombre requerido.').max(255),
  limit: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Monto decimal con hasta 2 decimales.'),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  periodType: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
  startDate: z.string().min(1, 'Fecha requerida.'),
  endDate: z.string().optional().nullable(),
  alertThreshold: z.number().int().min(1).max(100),
  categoryIds: z.array(z.string().uuid()).min(1, 'Selecciona al menos una categoría.'),
});

type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmitCreate: (input: CreateBudgetInput) => Promise<void>;
  onSubmitEdit?: (input: UpdateBudgetInput) => Promise<void>;
  categories: Category[];
  editing: Budget | null;
}

export function BudgetFormModal({
  open, onClose, onSubmitCreate, onSubmitEdit, categories, editing,
}: Props) {
  const isEdit = Boolean(editing);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '', limit: '', currency: 'PEN', periodType: 'MONTHLY',
      startDate: new Date().toISOString().slice(0, 10),
      endDate: null, alertThreshold: 80, categoryIds: [],
    },
  });
  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE');
  const selectedIds = form.watch('categoryIds');

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({
        name: editing.name,
        limit: editing.limit,
        currency: editing.currency,
        periodType: editing.periodType,
        startDate: editing.startDate.slice(0, 10),
        endDate: editing.endDate ? editing.endDate.slice(0, 10) : null,
        alertThreshold: editing.alertThreshold,
        categoryIds: editing.categories.map((c) => c.id),
      });
    } else {
      form.reset({
        name: '', limit: '', currency: 'PEN', periodType: 'MONTHLY',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: null, alertThreshold: 80, categoryIds: [],
      });
    }
    setServerError(null);
  }, [open, editing, form]);

  const toggleCategory = (id: string) => {
    const curr = form.getValues('categoryIds');
    const next = curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id];
    form.setValue('categoryIds', next, { shouldValidate: true });
  };

  const handleSubmit = form.handleSubmit(async (data) => {
    setIsSubmitting(true);
    setServerError(null);
    try {
      const base = {
        name: data.name,
        limit: data.limit,
        currency: data.currency,
        periodType: data.periodType,
        startDate: `${data.startDate}T00:00:00-05:00`,
        endDate: data.endDate ? `${data.endDate}T00:00:00-05:00` : null,
        categoryIds: data.categoryIds,
        alertThreshold: data.alertThreshold,
      };
      if (isEdit && onSubmitEdit) {
        await onSubmitEdit(base);
      } else {
        await onSubmitCreate(base);
      }
      onClose();
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Error inesperado');
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar presupuesto' : 'Nuevo presupuesto'}</DialogTitle>
        </DialogHeader>
        {serverError && (
          <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {serverError}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="limit">Límite</Label>
              <Input id="limit" {...form.register('limit')} />
              {form.formState.errors.limit && (
                <p className="mt-1 text-xs text-destructive">
                  {form.formState.errors.limit.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="periodType">Período</Label>
              <Controller control={form.control} name="periodType" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="periodType"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEEKLY">Semanal</SelectItem>
                    <SelectItem value="MONTHLY">Mensual</SelectItem>
                    <SelectItem value="QUARTERLY">Trimestral</SelectItem>
                    <SelectItem value="YEARLY">Anual</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="startDate">Inicio</Label>
              <Input id="startDate" type="date" {...form.register('startDate')} />
            </div>
            <div>
              <Label htmlFor="endDate">Fin (opcional)</Label>
              <Input id="endDate" type="date" {...form.register('endDate')} />
            </div>
            <div>
              <Label htmlFor="alertThreshold">Umbral alerta (%)</Label>
              <Input
                id="alertThreshold"
                type="number"
                min={1}
                max={100}
                {...form.register('alertThreshold', { valueAsNumber: true })}
              />
            </div>
          </div>
          <div>
            <Label>Categorías (gastos)</Label>
            <div className="max-h-48 overflow-y-auto rounded-md border border-border p-2 space-y-1">
              {expenseCategories.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No hay categorías de egresos disponibles.
                </p>
              )}
              {expenseCategories.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(c.id)}
                    onChange={() => toggleCategory(c.id)}
                  />
                  {c.name}
                </label>
              ))}
            </div>
            {form.formState.errors.categoryIds && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.categoryIds.message}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : (isEdit ? 'Guardar' : 'Crear presupuesto')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
