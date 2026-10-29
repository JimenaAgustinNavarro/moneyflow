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
import type { Category } from '@/types/category';
import type {
  CreateTransactionInput,
  Transaction,
  UpdateTransactionInput,
} from '@/types/transaction';

const amountSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Ingresa un monto con hasta 2 decimales.')
  .refine((amount) => Number(amount) > 0, 'El monto debe ser mayor a cero.');

const createSchema = z.object({
  accountId: z.string().min(1, 'Selecciona una cuenta.'),
  categoryId: z.string().nullable(),
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: amountSchema,
  description: z.string().max(500, 'Máximo 500 caracteres.'),
  date: z.string().min(1, 'Selecciona una fecha.'),
});

type FormValues = z.infer<typeof createSchema>;

interface TransactionFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmitCreate: (input: CreateTransactionInput) => Promise<void>;
  onSubmitEdit: (input: UpdateTransactionInput) => Promise<void>;
  accounts: Account[];
  categories: Category[];
  editing: Transaction | null;
}

function getTodayInLima(): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: 'year' | 'month' | 'day') =>
    parts.find((item) => item.type === type)?.value ?? '';

  return `${part('year')}-${part('month')}-${part('day')}`;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return fallback;
}

export function TransactionFormModal({
  open,
  onClose,
  onSubmitCreate,
  onSubmitEdit,
  accounts,
  categories,
  editing,
}: TransactionFormModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      accountId: '',
      categoryId: null,
      type: 'EXPENSE',
      amount: '',
      description: '',
      date: getTodayInLima(),
    },
  });
  const selectedType = form.watch('type');
  const filteredCategories = categories.filter((category) => category.type === selectedType);
  const { reset, setValue } = form;

  useEffect(() => {
    if (!open) return;

    if (editing) {
      reset({
        accountId: editing.accountId,
        categoryId: editing.categoryId,
        type: editing.type,
        amount: editing.amount,
        description: editing.description ?? '',
        date: editing.date.slice(0, 10),
      });
    } else {
      reset({
        accountId: '',
        categoryId: null,
        type: 'EXPENSE',
        amount: '',
        description: '',
        date: getTodayInLima(),
      });
    }
    setServerError(null);
  }, [editing, open, reset]);

  const submit = form.handleSubmit(async (data) => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const input = {
        accountId: data.accountId,
        categoryId: data.categoryId,
        amount: data.amount,
        description: data.description.trim() || null,
        date: data.date,
      };

      if (editing) {
        await onSubmitEdit({
          ...input,
          type: data.type,
        });
      } else {
        await onSubmitCreate({
          ...input,
          type: data.type,
        });
      }
      onClose();
    } catch (error) {
      setServerError(
        getErrorMessage(
          error,
          editing ? 'No se pudo actualizar el movimiento.' : 'No se pudo crear el movimiento.',
        ),
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
          <DialogTitle>{editing ? 'Editar movimiento' : 'Nuevo movimiento'}</DialogTitle>
        </DialogHeader>

        {serverError && (
          <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {serverError}
          </p>
        )}

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="transaction-type">Tipo</Label>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value: 'INCOME' | 'EXPENSE') => {
                    field.onChange(value);
                    setValue('categoryId', null);
                  }}
                  disabled={editing?.status === 'CONFIRMED'}
                >
                  <SelectTrigger
                    id="transaction-type"
                    className="w-full"
                    title={
                      editing?.status === 'CONFIRMED'
                        ? 'No puedes cambiar el tipo de un movimiento confirmado'
                        : undefined
                    }
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INCOME">Ingreso</SelectItem>
                    <SelectItem value="EXPENSE">Egreso</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transaction-account">Cuenta</Label>
            <Controller
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="transaction-account" className="w-full">
                    <SelectValue placeholder="Selecciona una cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.accountId && (
              <p className="text-xs text-destructive">{errors.accountId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="transaction-category">Categoría</Label>
            <Controller
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <Select
                  value={field.value ?? '__none__'}
                  onValueChange={(value) => field.onChange(value === '__none__' ? null : value)}
                >
                  <SelectTrigger id="transaction-category" className="w-full">
                    <SelectValue placeholder="Sin categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin categoría</SelectItem>
                    {filteredCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transaction-amount">Monto</Label>
            <Input
              id="transaction-amount"
              inputMode="decimal"
              aria-invalid={Boolean(errors.amount)}
              {...form.register('amount')}
            />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="transaction-date">Fecha</Label>
            <Input
              id="transaction-date"
              type="date"
              aria-invalid={Boolean(errors.date)}
              {...form.register('date')}
            />
            {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="transaction-description">Descripción (opcional)</Label>
            <Input id="transaction-description" maxLength={500} {...form.register('description')} />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : editing ? 'Guardar' : 'Crear movimiento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
