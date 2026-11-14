'use client';

import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAccounts } from '@/hooks/useAccounts';
import { ApiError } from '@/lib/api-client';
import type { CreateSavingsGoalInput, SavingsGoal, UpdateSavingsGoalInput } from '@/types/savings-goal';

const schema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio.').max(255, 'Máximo 255 caracteres.'),
  targetAmount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Ingresa un monto con hasta 2 decimales.')
    .refine((value) => Number(value) > 0, 'El monto debe ser mayor a cero.'),
  targetDate: z.string().optional().refine(
    (value) => !value || isValidISODate(value),
    'Ingresa una fecha válida.',
  ),
  accountId: z.union([z.literal('__none__'), z.string().uuid()]),
});

type FormData = z.infer<typeof schema>;

function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmitCreate: (input: CreateSavingsGoalInput) => Promise<void>;
  onSubmitEdit: (input: UpdateSavingsGoalInput) => Promise<void>;
  editing: SavingsGoal | null;
}

export function SavingsGoalFormModal({
  open,
  onClose,
  onSubmitCreate,
  onSubmitEdit,
  editing,
}: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const accountsQuery = useAccounts(false);
  const accounts = accountsQuery.data ?? [];
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', targetAmount: '', targetDate: '', accountId: '__none__' },
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      editing
        ? {
            name: editing.name,
            targetAmount: editing.targetAmount,
            targetDate: editing.targetDate ?? '',
            accountId: editing.accountId ?? '__none__',
          }
        : { name: '', targetAmount: '', targetDate: '', accountId: '__none__' },
    );
    setServerError(null);
  }, [open, editing, form]);

  const handleSubmit = form.handleSubmit(async (data) => {
    setIsSubmitting(true);
    setServerError(null);
    try {
      if (editing) {
        const input: UpdateSavingsGoalInput = {
          name: data.name,
          targetAmount: data.targetAmount,
          ...(data.targetDate ? { targetDate: data.targetDate } : {}),
          accountId: data.accountId === '__none__' ? null : data.accountId,
        };
        await onSubmitEdit(input);
      } else {
        const input: CreateSavingsGoalInput = {
          name: data.name,
          targetAmount: data.targetAmount,
          ...(data.targetDate ? { targetDate: data.targetDate } : {}),
          accountId: data.accountId === '__none__' ? null : data.accountId,
        };
        await onSubmitCreate(input);
      }
      onClose();
    } catch (error) {
      setServerError(error instanceof ApiError || error instanceof Error
        ? error.message
        : 'No se pudo guardar la meta.');
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar meta' : 'Nueva meta'}</DialogTitle>
        </DialogHeader>
        {serverError && (
          <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {serverError}
          </div>
        )}
        {accountsQuery.isError && (
          <p role="alert" className="text-sm text-destructive">
            No se pudieron cargar las cuentas.
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="goal-name">Nombre</Label>
            <Input id="goal-name" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="mt-1 text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="goal-target-amount">Monto objetivo</Label>
            <Input id="goal-target-amount" inputMode="decimal" {...form.register('targetAmount')} />
            {form.formState.errors.targetAmount && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.targetAmount.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="goal-account">Cuenta (opcional)</Label>
            <Controller
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="goal-account" className="w-full">
                    <SelectValue placeholder="Selecciona una cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin cuenta</SelectItem>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div>
            <Label htmlFor="goal-target-date">Fecha objetivo (opcional)</Label>
            <Input id="goal-target-date" type="date" {...form.register('targetDate')} />
            {form.formState.errors.targetDate && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.targetDate.message}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear meta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
