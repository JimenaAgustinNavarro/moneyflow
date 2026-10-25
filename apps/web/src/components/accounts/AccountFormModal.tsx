'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Animated } from '@/components/ui/motion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApiError } from '@/lib/api-client';
import type { Account, CreateAccountInput, UpdateAccountInput } from '@/types/account';

const accountTypes = ['CASH', 'BANK', 'WALLET', 'CREDIT'] as const;

const createSchema = z.object({
  name: z.string().trim().min(1, 'Ingresa un nombre.').max(60, 'Máximo 60 caracteres.'),
  type: z.enum(accountTypes),
  initialBalance: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Ingresa un monto con hasta 2 decimales.'),
  currency: z.string().trim().length(3, 'La moneda debe tener 3 caracteres.'),
});

const editSchema = z.object({
  name: z.string().trim().min(1, 'Ingresa un nombre.').max(60, 'Máximo 60 caracteres.'),
  type: z.enum(accountTypes),
});

type CreateFormValues = z.infer<typeof createSchema>;
type EditFormValues = z.infer<typeof editSchema>;

interface AccountFormModalProps {
  open: boolean;
  account: Account | null;
  onClose: () => void;
  onSubmitCreate: (data: CreateAccountInput) => Promise<void>;
  onSubmitEdit: (id: string, data: UpdateAccountInput) => Promise<void>;
}

export function AccountFormModal({
  open,
  account,
  onClose,
  onSubmitCreate,
  onSubmitEdit,
}: AccountFormModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="overflow-hidden rounded-2xl border border-border bg-background p-0 shadow-xl shadow-foreground/10">
        <Animated variant="scaleIn" className="p-6">
          {account ? (
            <EditAccountForm
              key={account.id}
              account={account}
              open={open}
              onClose={onClose}
              onSubmit={onSubmitEdit}
            />
          ) : (
            <CreateAccountForm open={open} onClose={onClose} onSubmit={onSubmitCreate} />
          )}
        </Animated>
      </DialogContent>
    </Dialog>
  );
}

function CreateAccountForm({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateAccountInput) => Promise<void>;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', type: 'BANK', initialBalance: '0.00', currency: 'PEN' },
  });
  const { reset } = form;

  useEffect(() => {
    if (open) {
      reset({ name: '', type: 'BANK', initialBalance: '0.00', currency: 'PEN' });
      setServerError(null);
    }
  }, [open, reset]);

  const submit = form.handleSubmit(async (data) => {
    setServerError(null);
    try {
      await onSubmit(data);
      onClose();
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'No se pudo crear la cuenta.');
    }
  });

  const { errors } = form.formState;

  return (
    <>
      <DialogHeader className="mb-4">
        <DialogTitle className="text-xl font-semibold tracking-tight">Nueva cuenta</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {serverError && (
          <Animated
            variant="fadeIn"
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {serverError}
          </Animated>
        )}
        <div className="space-y-2">
          <Label htmlFor="create-account-name">Nombre</Label>
          <Input
            id="create-account-name"
            {...form.register('name')}
            className="rounded-xl border-input bg-background/80 shadow-sm transition-all focus:border-primary/70 focus:ring-2 focus:ring-primary/20"
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-account-type">Tipo</Label>
          <Controller
            control={form.control}
            name="type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="create-account-type" className="w-full">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Efectivo</SelectItem>
                  <SelectItem value="BANK">Banco</SelectItem>
                  <SelectItem value="WALLET">Billetera</SelectItem>
                  <SelectItem value="CREDIT">Tarjeta de crédito</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-account-balance">Saldo inicial</Label>
          <Input
            id="create-account-balance"
            inputMode="decimal"
            {...form.register('initialBalance')}
            className="rounded-xl border-input bg-background/80 shadow-sm transition-all focus:border-primary/70 focus:ring-2 focus:ring-primary/20"
          />
          {errors.initialBalance && (
            <p className="text-xs text-destructive">{errors.initialBalance.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-account-currency">Moneda</Label>
          <Input
            id="create-account-currency"
            maxLength={3}
            {...form.register('currency')}
            className="rounded-xl border-input bg-background/80 shadow-sm transition-all focus:border-primary/70 focus:ring-2 focus:ring-primary/20"
          />
          {errors.currency && <p className="text-xs text-destructive">{errors.currency.message}</p>}
        </div>
        <FormButtons
          isSubmitting={form.formState.isSubmitting}
          onClose={onClose}
          submitLabel="Crear cuenta"
        />
      </form>
    </>
  );
}

function EditAccountForm({
  account,
  open,
  onClose,
  onSubmit,
}: {
  account: Account;
  open: boolean;
  onClose: () => void;
  onSubmit: (id: string, data: UpdateAccountInput) => Promise<void>;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: account.name, type: account.type },
  });
  const { reset } = form;

  useEffect(() => {
    if (open) {
      reset({ name: account.name, type: account.type });
      setServerError(null);
    }
  }, [account.name, account.type, open, reset]);

  const submit = form.handleSubmit(async (data) => {
    setServerError(null);
    try {
      await onSubmit(account.id, data);
      onClose();
    } catch (error) {
      setServerError(
        error instanceof ApiError ? error.message : 'No se pudo actualizar la cuenta.',
      );
    }
  });

  const { errors } = form.formState;

  return (
    <>
      <DialogHeader className="mb-4">
        <DialogTitle className="text-xl font-semibold tracking-tight">Editar cuenta</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {serverError && (
          <Animated
            variant="fadeIn"
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {serverError}
          </Animated>
        )}
        <div className="space-y-2">
          <Label htmlFor="edit-account-name">Nombre</Label>
          <Input
            id="edit-account-name"
            {...form.register('name')}
            className="rounded-xl border-input bg-background/80 shadow-sm transition-all focus:border-primary/70 focus:ring-2 focus:ring-primary/20"
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-account-type">Tipo</Label>
          <Controller
            control={form.control}
            name="type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="edit-account-type" className="w-full">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Efectivo</SelectItem>
                  <SelectItem value="BANK">Banco</SelectItem>
                  <SelectItem value="WALLET">Billetera</SelectItem>
                  <SelectItem value="CREDIT">Tarjeta de crédito</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <FormButtons
          isSubmitting={form.formState.isSubmitting}
          onClose={onClose}
          submitLabel="Guardar"
        />
      </form>
    </>
  );
}

function FormButtons({
  isSubmitting,
  onClose,
  submitLabel,
}: {
  isSubmitting: boolean;
  onClose: () => void;
  submitLabel: string;
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
        Cancelar
      </Button>
      <Button
        type="submit"
        disabled={isSubmitting}
        className="shadow-md shadow-primary/15 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/20"
      >
        {isSubmitting ? 'Guardando...' : submitLabel}
      </Button>
    </div>
  );
}
