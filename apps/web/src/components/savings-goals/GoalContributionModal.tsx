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
import { ApiError } from '@/lib/api-client';
import { formatCurrency } from '@/lib/format-currency';
import type { ContributionType, CreateGoalContributionInput, SavingsGoal } from '@/types/savings-goal';

const schema = z.object({
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Ingresa un monto con hasta 2 decimales.')
    .refine((value) => Number(value) > 0, 'El monto debe ser mayor a cero.'),
  date: z
    .string()
    .min(1, 'La fecha es obligatoria.')
    .refine((value) => !value || isValidISODate(value), 'Ingresa una fecha válida.'),
  type: z.enum(['DEPOSIT', 'WITHDRAWAL']),
  transactionId: z.union([
    z.literal(''),
    z.string().uuid('Ingresa un ID de movimiento válido.'),
  ]),
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
  onSubmit: (input: CreateGoalContributionInput) => Promise<void>;
  goal: SavingsGoal | null;
  defaultType?: ContributionType;
}

function amountInCents(value: string): number {
  const [whole, fraction = ''] = value.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

export function GoalContributionModal({
  open,
  onClose,
  onSubmit,
  goal,
  defaultType = 'DEPOSIT',
}: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      type: defaultType,
      transactionId: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      type: defaultType,
      transactionId: '',
    });
    setServerError(null);
  }, [open, defaultType, goal, form]);

  const handleSubmit = form.handleSubmit(async (data) => {
    if (!goal) return;
    setServerError(null);
    if (
      data.type === 'WITHDRAWAL' &&
      amountInCents(data.amount) > amountInCents(goal.currentAmount)
    ) {
      form.setError('amount', {
        type: 'validate',
        message: 'El retiro no puede superar el saldo disponible.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        amount: data.amount,
        date: `${data.date}T00:00:00-05:00`,
        type: data.type,
        ...(data.transactionId ? { transactionId: data.transactionId } : {}),
      });
      onClose();
    } catch (error) {
      setServerError(error instanceof ApiError || error instanceof Error
        ? error.message
        : 'No se pudo registrar el aporte.');
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{form.watch('type') === 'WITHDRAWAL' ? 'Retirar de la meta' : 'Registrar aporte'}</DialogTitle>
        </DialogHeader>
        {goal && (
          <p className="text-sm text-muted-foreground">
            {goal.name} · Saldo disponible: {formatCurrency(goal.currentAmount)}
          </p>
        )}
        {serverError && (
          <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {serverError}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="contribution-type">Tipo</Label>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="contribution-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEPOSIT">Depositar</SelectItem>
                    <SelectItem value="WITHDRAWAL">Retirar</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div>
            <Label htmlFor="contribution-amount">Monto</Label>
            <Input id="contribution-amount" inputMode="decimal" {...form.register('amount')} />
            {form.formState.errors.amount && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.amount.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="contribution-date">Fecha</Label>
            <Input id="contribution-date" type="date" {...form.register('date')} />
            {form.formState.errors.date && (
              <p className="mt-1 text-xs text-destructive">{form.formState.errors.date.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="contribution-transaction">ID de movimiento (opcional)</Label>
            <Input id="contribution-transaction" {...form.register('transactionId')} />
            {form.formState.errors.transactionId && (
              <p className="mt-1 text-xs text-destructive">
                {form.formState.errors.transactionId.message}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !goal}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
