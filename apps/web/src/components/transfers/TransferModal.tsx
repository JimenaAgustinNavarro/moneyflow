'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
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
import type { Account } from '@/types/account';
import type { CreateTransferInput } from '@/types/transfer';

const schema = z
  .object({
    originAccountId: z.string().min(1, 'Selecciona una cuenta de origen.'),
    destinationAccountId: z.string().min(1, 'Selecciona una cuenta de destino.'),
    amount: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, 'Monto decimal con hasta 2 decimales.')
      .refine((amount) => Number(amount) > 0, 'El monto debe ser mayor a cero.'),
    description: z.string().max(500, 'Máximo 500 caracteres.'),
    date: z.string().min(1, 'Selecciona una fecha.'),
  })
  .refine((data) => data.originAccountId !== data.destinationAccountId, {
    message: 'Las cuentas de origen y destino deben ser distintas.',
    path: ['destinationAccountId'],
  });

type FormData = z.infer<typeof schema>;

interface TransferModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: CreateTransferInput) => Promise<void>;
  accounts: Account[];
}

function getTodayInLima(): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = (type: 'year' | 'month' | 'day') =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function TransferModal({ open, onClose, onSubmit, accounts }: TransferModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      originAccountId: '',
      destinationAccountId: '',
      amount: '',
      description: '',
      date: getTodayInLima(),
    },
  });

  const originAccountId = form.watch('originAccountId');
  const destinationAccountId = form.watch('destinationAccountId');
  const originOptions = accounts.filter((account) => account.id !== destinationAccountId);
  const destinationOptions = accounts.filter((account) => account.id !== originAccountId);

  useEffect(() => {
    if (!open) return;

    form.reset({
      originAccountId: '',
      destinationAccountId: '',
      amount: '',
      description: '',
      date: getTodayInLima(),
    });
    setServerError(null);
  }, [form, open]);

  const submit = form.handleSubmit(async (data) => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        originAccountId: data.originAccountId,
        destinationAccountId: data.destinationAccountId,
        amount: data.amount,
        description: data.description.trim() || null,
        date: `${data.date}T00:00:00-05:00`,
      });
      onClose();
    } catch (error) {
      setServerError(
        error instanceof ApiError || error instanceof Error
          ? error.message
          : 'No se pudo crear la transferencia.',
      );
    } finally {
      setIsSubmitting(false);
    }
  });

  const errors = form.formState.errors;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva transferencia</DialogTitle>
        </DialogHeader>

        {serverError && (
          <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {serverError}
          </p>
        )}

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="transfer-origin">Cuenta origen</Label>
            <Controller
              control={form.control}
              name="originAccountId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="transfer-origin" className="w-full">
                    <SelectValue placeholder="Selecciona una cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {originOptions.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.originAccountId && (
              <p className="text-xs text-destructive">{errors.originAccountId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="transfer-destination">Cuenta destino</Label>
            <Controller
              control={form.control}
              name="destinationAccountId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="transfer-destination" className="w-full">
                    <SelectValue placeholder="Selecciona una cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {destinationOptions.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.destinationAccountId && (
              <p className="text-xs text-destructive">{errors.destinationAccountId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="transfer-amount">Monto</Label>
            <Input
              id="transfer-amount"
              inputMode="decimal"
              aria-invalid={Boolean(errors.amount)}
              {...form.register('amount')}
            />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="transfer-date">Fecha</Label>
            <Input
              id="transfer-date"
              type="date"
              aria-invalid={Boolean(errors.date)}
              {...form.register('date')}
            />
            {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="transfer-description">Descripción (opcional)</Label>
            <Input id="transfer-description" maxLength={500} {...form.register('description')} />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creando...' : 'Crear transferencia'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
