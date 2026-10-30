'use client';

import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ApiError } from '@/lib/api-client';
import type { Account } from '@/types/account';
import type { Category } from '@/types/category';
import type { CreateObligationInput, Obligation, UpdateObligationInput } from '@/types/obligation';

const schema = z.object({
  name: z.string().min(1, 'Nombre requerido.').max(255),
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Monto decimal con hasta 2 decimales.'),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  description: z.string().max(500).optional(),
  dueDate: z.string().min(1, 'Fecha requerida.'),
  accountId: z.string().uuid('Cuenta requerida.'),
  categoryId: z.string().uuid().nullable().optional(),
});
type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmitCreate: (input: CreateObligationInput) => Promise<void>;
  onSubmitEdit?: (input: UpdateObligationInput) => Promise<void>;
  accounts: Account[];
  categories: Category[];
  editing: Obligation | null;
}

export function ObligationFormModal({ open, onClose, onSubmitCreate, onSubmitEdit, accounts, categories, editing }: Props) {
  const isEdit = Boolean(editing);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { name: '', type: 'EXPENSE', amount: '', currency: 'PEN', description: '', dueDate: new Date().toISOString().slice(0, 10), accountId: '', categoryId: null } });
  const type = form.watch('type');
  const filteredCategories = categories.filter((category) => category.type === type);

  useEffect(() => {
    if (!open) return;
    form.reset(editing ? { name: editing.name, type: editing.type, amount: editing.amount, currency: editing.currency, description: editing.description ?? '', dueDate: editing.dueDate.slice(0, 10), accountId: editing.accountId, categoryId: editing.categoryId } : { name: '', type: 'EXPENSE', amount: '', currency: 'PEN', description: '', dueDate: new Date().toISOString().slice(0, 10), accountId: '', categoryId: null });
    setServerError(null);
  }, [open, editing, form]);

  const handleSubmit = form.handleSubmit(async (data) => {
    setIsSubmitting(true); setServerError(null);
    try {
      const input = { name: data.name, type: data.type, amount: data.amount, currency: data.currency, description: data.description || null, dueDate: `${data.dueDate}T00:00:00-05:00`, accountId: data.accountId, categoryId: data.categoryId };
      if (isEdit && onSubmitEdit) await onSubmitEdit(input); else await onSubmitCreate(input);
      onClose();
    } catch (error) { setServerError(error instanceof ApiError ? error.message : 'Error inesperado'); }
    finally { setIsSubmitting(false); }
  });

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>{isEdit ? 'Editar obligación' : 'Nueva obligación'}</DialogTitle></DialogHeader>
        {serverError && <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{serverError}</div>}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div><Label htmlFor="name">Nombre</Label><Input id="name" {...form.register('name')} />{form.formState.errors.name && <p className="mt-1 text-xs text-destructive">{form.formState.errors.name.message}</p>}</div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="type">Tipo</Label><Controller control={form.control} name="type" render={({ field }) => <Select value={field.value} onValueChange={field.onChange}><SelectTrigger id="type"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="EXPENSE">Egreso</SelectItem><SelectItem value="INCOME">Ingreso</SelectItem></SelectContent></Select>} /></div>
            <div><Label htmlFor="amount">Monto</Label><Input id="amount" {...form.register('amount')} />{form.formState.errors.amount && <p className="mt-1 text-xs text-destructive">{form.formState.errors.amount.message}</p>}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="accountId">Cuenta</Label><Controller control={form.control} name="accountId" render={({ field }) => <Select value={field.value} onValueChange={field.onChange}><SelectTrigger id="accountId"><SelectValue placeholder="Selecciona" /></SelectTrigger><SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select>} /></div>
            <div><Label htmlFor="categoryId">Categoría</Label><Controller control={form.control} name="categoryId" render={({ field }) => <Select value={field.value ?? '__none__'} onValueChange={(value) => field.onChange(value === '__none__' ? null : value)}><SelectTrigger id="categoryId"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none__">Sin categoría</SelectItem>{filteredCategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>} /></div>
          </div>
          <div><Label htmlFor="dueDate">Fecha de vencimiento</Label><Input id="dueDate" type="date" {...form.register('dueDate')} /></div>
          <div><Label htmlFor="description">Descripción (opcional)</Label><Input id="description" {...form.register('description')} /></div>
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancelar</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Guardando...' : (isEdit ? 'Guardar' : 'Crear obligación')}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
