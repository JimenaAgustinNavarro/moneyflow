'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/lib/api-client';
import type { Account, CreateAccountInput, UpdateAccountInput } from '@/types/account';

const accountTypes = ['CASH', 'BANK', 'WALLET', 'CREDIT'] as const;

const createSchema = z.object({
  name: z.string().trim().min(1, 'Ingresá un nombre.').max(60, 'Máximo 60 caracteres.'),
  type: z.enum(accountTypes),
  initialBalance: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Ingresá un monto con hasta 2 decimales.'),
  currency: z.string().trim().length(3, 'La moneda debe tener 3 caracteres.'),
});

const editSchema = z.object({
  name: z.string().trim().min(1, 'Ingresá un nombre.').max(60, 'Máximo 60 caracteres.'),
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
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Nueva cuenta</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {serverError && (
          <p role="alert" className="text-sm text-destructive">
            {serverError}
          </p>
        )}
        <div className="space-y-2">
          <Label htmlFor="create-account-name">Nombre</Label>
          <Input id="create-account-name" {...form.register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <AccountTypeField id="create-account-type" registration={form.register('type')} />
        <div className="space-y-2">
          <Label htmlFor="create-account-balance">Saldo inicial</Label>
          <Input
            id="create-account-balance"
            inputMode="decimal"
            {...form.register('initialBalance')}
          />
          {errors.initialBalance && (
            <p className="text-xs text-destructive">{errors.initialBalance.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-account-currency">Moneda</Label>
          <Input id="create-account-currency" maxLength={3} {...form.register('currency')} />
          {errors.currency && <p className="text-xs text-destructive">{errors.currency.message}</p>}
        </div>
        <FormButtons
          isSubmitting={form.formState.isSubmitting}
          onClose={onClose}
          submitLabel="Crear cuenta"
        />
      </form>
    </DialogContent>
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
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Editar cuenta</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {serverError && (
          <p role="alert" className="text-sm text-destructive">
            {serverError}
          </p>
        )}
        <div className="space-y-2">
          <Label htmlFor="edit-account-name">Nombre</Label>
          <Input id="edit-account-name" {...form.register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <AccountTypeField id="edit-account-type" registration={form.register('type')} />
        <FormButtons
          isSubmitting={form.formState.isSubmitting}
          onClose={onClose}
          submitLabel="Guardar"
        />
      </form>
    </DialogContent>
  );
}

function AccountTypeField({
  id,
  registration,
}: {
  id: string;
  registration: UseFormRegisterReturn;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Tipo</Label>
      <select
        id={id}
        {...registration}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
      >
        <option value="CASH">Efectivo</option>
        <option value="BANK">Banco</option>
        <option value="WALLET">Billetera</option>
        <option value="CREDIT">Tarjeta de crédito</option>
      </select>
    </div>
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
    <div className="flex justify-end gap-2">
      <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
        Cancelar
      </Button>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Guardando...' : submitLabel}
      </Button>
    </div>
  );
}
