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
import { formatCurrency } from '@/lib/format-currency';
import type { Account } from '@/types/account';
import type { Obligation, PayObligationInput } from '@/types/obligation';

const schema = z.object({ amount: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Monto inválido.'), paidAt: z.string().min(1), accountId: z.string().uuid('Cuenta requerida.'), description: z.string().max(500).optional() });
type FormData = z.infer<typeof schema>;

interface Props { open: boolean; onClose: () => void; onSubmit: (input: PayObligationInput) => Promise<void>; accounts: Account[]; obligation: Obligation | null; }

export function PayObligationModal({ open, onClose, onSubmit, accounts, obligation }: Props) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const paid = obligation ? obligation.payments.filter((payment) => payment.status === 'CONFIRMED').reduce((sum, payment) => sum + Number(payment.amount), 0) : 0;
  const total = obligation ? Number(obligation.amount) : 0;
  const pending = Math.max(total - paid, 0);
  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { amount: '', paidAt: new Date().toISOString().slice(0, 10), accountId: '', description: '' } });

  useEffect(() => {
    if (!open || !obligation) return;
    form.reset({ amount: pending.toFixed(2), paidAt: new Date().toISOString().slice(0, 10), accountId: obligation.accountId, description: '' });
    setServerError(null);
  }, [open, obligation, pending, form]);

  const handleSubmit = form.handleSubmit(async (data) => {
    setIsSubmitting(true); setServerError(null);
    try { await onSubmit({ amount: data.amount, paidAt: `${data.paidAt}T00:00:00-05:00`, accountId: data.accountId, description: data.description || undefined }); onClose(); }
    catch (error) { setServerError(error instanceof ApiError ? error.message : 'Error inesperado'); }
    finally { setIsSubmitting(false); }
  });
  if (!obligation) return null;

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}><DialogContent><DialogHeader><DialogTitle>Pagar: {obligation.name}</DialogTitle></DialogHeader>
      <div className="space-y-1 rounded-md bg-muted/50 p-3 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Total:</span><span>{formatCurrency(total.toFixed(2), obligation.currency)}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Pagado:</span><span>{formatCurrency(paid.toFixed(2), obligation.currency)}</span></div><div className="flex justify-between font-semibold"><span>Pendiente:</span><span>{formatCurrency(pending.toFixed(2), obligation.currency)}</span></div></div>
      {serverError && <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{serverError}</div>}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="amount">Monto a pagar</Label><Input id="amount" {...form.register('amount')} />{form.formState.errors.amount && <p className="mt-1 text-xs text-destructive">{form.formState.errors.amount.message}</p>}</div><div><Label htmlFor="paidAt">Fecha de pago</Label><Input id="paidAt" type="date" {...form.register('paidAt')} /></div></div>
        <div><Label htmlFor="accountId">Cuenta de pago</Label><Controller control={form.control} name="accountId" render={({ field }) => <Select value={field.value} onValueChange={field.onChange}><SelectTrigger id="accountId"><SelectValue /></SelectTrigger><SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select>} /></div>
        <div><Label htmlFor="description">Descripción (opcional)</Label><Input id="description" {...form.register('description')} /></div>
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancelar</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Pagando...' : 'Pagar'}</Button></div>
      </form>
    </DialogContent></Dialog>
  );
}
