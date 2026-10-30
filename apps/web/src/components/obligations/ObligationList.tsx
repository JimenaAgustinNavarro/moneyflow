'use client';

import { CheckCircle2, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format-currency';
import type { Obligation, ObligationStatus } from '@/types/obligation';

const STATUS_LABELS: Record<ObligationStatus, string> = { PENDING: 'Pendiente', PARTIALLY_PAID: 'Parcial', PAID: 'Pagada', OVERDUE: 'Vencida', CANCELLED: 'Cancelada' };
const STATUS_BADGES: Record<ObligationStatus, string> = { PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', PARTIALLY_PAID: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300', PAID: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', OVERDUE: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300', CANCELLED: 'bg-muted text-muted-foreground' };
const TYPE_BADGES: Record<string, string> = { INCOME: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', EXPENSE: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' };

interface Props { obligations: Obligation[]; onEdit: (o: Obligation) => void; onPay: (o: Obligation) => void; onDelete: (o: Obligation) => void; onRestore: (o: Obligation) => void; isLoading?: boolean; }

export function ObligationList({ obligations, onEdit, onPay, onDelete, onRestore, isLoading }: Props) {
  if (isLoading) return <p className="py-8 text-center text-sm text-muted-foreground">Cargando obligaciones...</p>;
  if (obligations.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">No hay obligaciones. Crea una o genera las pendientes del mes.</p>;
  return (
    <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-left text-xs uppercase text-muted-foreground"><th className="px-3 py-2">Nombre</th><th className="px-3 py-2">Tipo</th><th className="px-3 py-2">Estado</th><th className="px-3 py-2">Vence</th><th className="px-3 py-2">Cuenta</th><th className="px-3 py-2">Categoría</th><th className="px-3 py-2 text-right">Monto</th><th className="px-3 py-2 text-right">Acciones</th></tr></thead>
      <tbody>{obligations.map((o) => { const deleted = Boolean(o.deletedAt); const canPay = !deleted && o.status !== 'PAID' && o.status !== 'CANCELLED'; return (
        <tr key={o.id} className="border-b border-border/50 hover:bg-accent/40"><td className="px-3 py-2"><div className="flex flex-col"><span className="font-medium text-foreground">{o.name}</span>{deleted && <span className="text-xs text-rose-600 dark:text-rose-400">Eliminada</span>}</div></td><td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGES[o.type]}`}>{o.type === 'INCOME' ? 'Ingreso' : 'Egreso'}</span></td><td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGES[o.status]}`}>{STATUS_LABELS[o.status]}</span></td><td className="px-3 py-2 text-muted-foreground">{new Date(o.dueDate).toLocaleDateString('es-PE', { timeZone: 'America/Lima' })}</td><td className="px-3 py-2 text-muted-foreground">{o.accountName}</td><td className="px-3 py-2 text-muted-foreground">{o.categoryName ?? 'Sin categoría'}</td><td className="px-3 py-2 text-right font-semibold text-foreground">{formatCurrency(o.amount, o.currency)}</td><td className="px-3 py-2 text-right"><div className="flex justify-end gap-1">{deleted ? <Button variant="ghost" size="icon" onClick={() => onRestore(o)} aria-label={`Restaurar ${o.name}`}><RotateCcw className="h-4 w-4" /></Button> : <>{canPay && <Button variant="ghost" size="icon" onClick={() => onPay(o)} aria-label={`Pagar ${o.name}`}><CheckCircle2 className="h-4 w-4" /></Button>}<Button variant="ghost" size="icon" onClick={() => onEdit(o)} aria-label={`Editar ${o.name}`}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => onDelete(o)} aria-label={`Cancelar ${o.name}`}><Trash2 className="h-4 w-4" /></Button></>}</div></td></tr>
      ); })}</tbody></table></div>
  );
}
