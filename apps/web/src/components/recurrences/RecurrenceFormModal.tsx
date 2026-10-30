'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApiError } from '@/lib/api-client';
import type { Account } from '@/types/account';
import type { Category } from '@/types/category';
import type {
  CreateRecurrenceInput,
  Recurrence,
  RecurrenceFrequency,
  UpdateRecurrenceInput,
} from '@/types/recurrence';

const FREQUENCY_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'WEEKLY', label: 'Semanal' },
  { value: 'BIWEEKLY', label: 'Quincenal' },
  { value: 'MONTHLY', label: 'Mensual' },
  { value: 'QUARTERLY', label: 'Trimestral' },
  { value: 'YEARLY', label: 'Anual' },
];

const schema = z
  .object({
    name: z.string().min(1, 'Nombre requerido.').max(255, 'Máximo 255 caracteres.'),
    type: z.enum(['INCOME', 'EXPENSE']),
    amount: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, 'Ingresa un monto con hasta 2 decimales.')
      .refine((amount) => Number(amount) > 0, 'El monto debe ser mayor a cero.'),
    currency: z.string().regex(/^[A-Z]{3}$/, 'Moneda inválida.'),
    description: z.string().max(500, 'Máximo 500 caracteres.'),
    frequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
    dayOfPeriod: z.number().int().min(1).max(31).nullable().optional(),
    startDate: z.string().min(1, 'Fecha de inicio requerida.'),
    endDate: z.string().nullable(),
    accountId: z.string().min(1, 'Selecciona una cuenta.'),
    categoryId: z.string().nullable(),
  })
  .superRefine((values, context) => {
    if (['MONTHLY', 'QUARTERLY', 'YEARLY'].includes(values.frequency) && !values.dayOfPeriod) {
      context.addIssue({
        code: 'custom',
        path: ['dayOfPeriod'],
        message: 'Día del período requerido.',
      });
    }
  });

type FormValues = z.infer<typeof schema>;

interface RecurrenceFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmitCreate: (input: CreateRecurrenceInput) => Promise<void>;
  onSubmitEdit: (input: UpdateRecurrenceInput) => Promise<void>;
  accounts: Account[];
  categories: Category[];
  editing: Recurrence | null;
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
  return error instanceof ApiError || error instanceof Error ? error.message : fallback;
}

export function RecurrenceFormModal({
  open,
  onClose,
  onSubmitCreate,
  onSubmitEdit,
  accounts,
  categories,
  editing,
}: RecurrenceFormModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      type: 'EXPENSE',
      amount: '',
      currency: 'PEN',
      description: '',
      frequency: 'MONTHLY',
      dayOfPeriod: 1,
      startDate: getTodayInLima(),
      endDate: null,
      accountId: '',
      categoryId: null,
    },
  });
  const selectedFrequency = form.watch('frequency');
  const selectedType = form.watch('type');
  const showDayOfPeriod = ['MONTHLY', 'QUARTERLY', 'YEARLY'].includes(selectedFrequency);
  const filteredCategories = categories.filter((category) => category.type === selectedType);
  const { reset, setValue } = form;

  useEffect(() => {
    if (!open) return;
    if (editing) {
      reset({
        name: editing.name,
        type: editing.type,
        amount: editing.amount,
        currency: editing.currency,
        description: editing.description ?? '',
        frequency: editing.frequency,
        dayOfPeriod: editing.dayOfPeriod,
        startDate: editing.startDate.slice(0, 10),
        endDate: editing.endDate ? editing.endDate.slice(0, 10) : null,
        accountId: editing.accountId ?? '',
        categoryId: editing.categoryId,
      });
    } else {
      reset({
        name: '',
        type: 'EXPENSE',
        amount: '',
        currency: 'PEN',
        description: '',
        frequency: 'MONTHLY',
        dayOfPeriod: 1,
        startDate: getTodayInLima(),
        endDate: null,
        accountId: '',
        categoryId: null,
      });
    }
    setServerError(null);
  }, [editing, open, reset]);

  const submit = form.handleSubmit(async (values) => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const input = {
        name: values.name.trim(),
        type: values.type,
        amount: values.amount,
        currency: values.currency,
        description: values.description.trim() || null,
        frequency: values.frequency,
        dayOfPeriod: showDayOfPeriod ? values.dayOfPeriod : null,
        startDate: `${values.startDate}T00:00:00-05:00`,
        endDate: values.endDate ? `${values.endDate}T00:00:00-05:00` : null,
        accountId: values.accountId,
        categoryId: values.categoryId,
      };
      if (editing) await onSubmitEdit(input);
      else await onSubmitCreate(input);
      onClose();
    } catch (error) {
      setServerError(
        getErrorMessage(error, editing ? 'No se pudo actualizar la recurrencia.' : 'No se pudo crear la recurrencia.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  });

  const errors = form.formState.errors;
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar recurrencia' : 'Nueva recurrencia'}</DialogTitle>
        </DialogHeader>
        {serverError && (
          <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {serverError}
          </p>
        )}
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="recurrence-name">Nombre</Label>
            <Input id="recurrence-name" {...form.register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="recurrence-type">Tipo</Label>
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
                  >
                    <SelectTrigger id="recurrence-type" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EXPENSE">Egreso</SelectItem>
                      <SelectItem value="INCOME">Ingreso</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recurrence-amount">Monto</Label>
              <Input id="recurrence-amount" {...form.register('amount')} />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="recurrence-frequency">Frecuencia</Label>
              <Controller
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="recurrence-frequency" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FREQUENCY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            {showDayOfPeriod && (
              <div className="space-y-2">
                <Label htmlFor="recurrence-day">Día del período (1-31)</Label>
                <Input id="recurrence-day" type="number" min={1} max={31} {...form.register('dayOfPeriod', { valueAsNumber: true })} />
                {errors.dayOfPeriod && <p className="text-xs text-destructive">{errors.dayOfPeriod.message}</p>}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="recurrence-account">Cuenta</Label>
              <Controller
                control={form.control}
                name="accountId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="recurrence-account" className="w-full"><SelectValue placeholder="Selecciona una cuenta" /></SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.accountId && <p className="text-xs text-destructive">{errors.accountId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="recurrence-category">Categoría</Label>
              <Controller
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <Select value={field.value ?? '__none__'} onValueChange={(value) => field.onChange(value === '__none__' ? null : value)}>
                    <SelectTrigger id="recurrence-category" className="w-full"><SelectValue placeholder="Sin categoría" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sin categoría</SelectItem>
                      {filteredCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="recurrence-start-date">Fecha de inicio</Label>
              <Input id="recurrence-start-date" type="date" {...form.register('startDate')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recurrence-end-date">Fecha de fin (opcional)</Label>
              <Input id="recurrence-end-date" type="date" {...form.register('endDate')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="recurrence-description">Descripción (opcional)</Label>
            <Input id="recurrence-description" {...form.register('description')} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : editing ? 'Guardar' : 'Crear recurrencia'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
