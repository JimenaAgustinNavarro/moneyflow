'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';

import { TransactionFormModal } from '@/components/transactions/TransactionFormModal';
import { TransactionList } from '@/components/transactions/TransactionList';
import { TransactionFilters } from '@/components/transactions/TransactionFilters';
import { Button } from '@/components/ui/button';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { useAccounts } from '@/hooks/useAccounts';
import {
  useCreateTransaction,
  useDeleteTransaction,
  useTransactions,
  useUpdateTransaction,
} from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { ApiError } from '@/lib/api-client';
import { formatCurrency } from '@/lib/format-currency';
import type {
  CreateTransactionInput,
  Transaction,
  TransactionFilters as Filters,
  UpdateTransactionInput,
} from '@/types/transaction';

const PAGE_SIZE = 20;

export default function TransactionsPage() {
  const [filterValues, setFilterValues] = useState<Omit<Filters, 'page' | 'limit'>>({});
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
  const [notice, setNotice] = useState<{ message: string; isError: boolean } | null>(null);

  useEffect(() => {
    setPage(1);
  }, [
    filterValues.accountId,
    filterValues.categoryId,
    filterValues.type,
    filterValues.from,
    filterValues.to,
  ]);

  const filters: Filters = { ...filterValues, page, limit: PAGE_SIZE };
  const accountsQuery = useAccounts(false);
  const categoriesQuery = useCategories();
  const transactionsQuery = useTransactions(filters);
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const deleteTransaction = useDeleteTransaction();

  const accounts = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data]);
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const accountNameById = useMemo(
    () => Object.fromEntries(accounts.map((account) => [account.id, account.name])),
    [accounts],
  );
  const categoryNameById = useMemo(
    () => Object.fromEntries(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const showError = (error: unknown, fallback: string) => {
    setNotice({
      message: error instanceof ApiError || error instanceof Error ? error.message : fallback,
      isError: true,
    });
  };

  const handleCreate = async (input: CreateTransactionInput) => {
    await createTransaction.mutateAsync(input);
    setNotice({ message: 'Movimiento creado.', isError: false });
  };

  const handleEdit = async (input: UpdateTransactionInput) => {
    if (!editing) return;
    await updateTransaction.mutateAsync({ id: editing.id, input });
    setNotice({ message: 'Movimiento actualizado.', isError: false });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;

    try {
      await deleteTransaction.mutateAsync(pendingDelete.id);
      setNotice({ message: 'Movimiento eliminado.', isError: false });
    } catch (error) {
      showError(error, 'No se pudo eliminar el movimiento.');
    } finally {
      setPendingDelete(null);
    }
  };

  const transactions = transactionsQuery.data?.data ?? [];
  const meta = transactionsQuery.data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Movimientos</h1>
          <p className="text-sm text-muted-foreground">
            Registra y consulta tus ingresos y egresos.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus aria-hidden="true" className="mr-2 h-4 w-4" />
          Nuevo movimiento
        </Button>
      </div>

      {notice && (
        <p
          role={notice.isError ? 'alert' : 'status'}
          className={`rounded-md p-3 text-sm ${
            notice.isError ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
          }`}
        >
          {notice.message}
        </p>
      )}

      {accountsQuery.isError && (
        <p role="alert" className="text-sm text-destructive">
          {accountsQuery.error.message || 'No se pudieron cargar las cuentas.'}
        </p>
      )}
      {categoriesQuery.isError && (
        <p role="alert" className="text-sm text-destructive">
          {categoriesQuery.error.message || 'No se pudieron cargar las categorías.'}
        </p>
      )}

      <TransactionFilters
        filters={filters}
        accounts={accounts}
        categories={categories}
        onChange={(nextFilters) => {
          setFilterValues({
            accountId: nextFilters.accountId,
            categoryId: nextFilters.categoryId,
            type: nextFilters.type,
            from: nextFilters.from,
            to: nextFilters.to,
          });
          setPage(1);
        }}
        onReset={() => {
          setFilterValues({});
          setPage(1);
        }}
      />

      {transactionsQuery.isPending && (
        <p role="status" className="text-sm text-muted-foreground">
          Cargando movimientos...
        </p>
      )}
      {transactionsQuery.isError && (
        <p role="alert" className="text-sm text-destructive">
          {transactionsQuery.error instanceof Error
            ? transactionsQuery.error.message
            : 'No se pudieron cargar los movimientos.'}
        </p>
      )}
      {transactionsQuery.isSuccess && (
        <TransactionList
          transactions={transactions}
          accountNameById={accountNameById}
          categoryNameById={categoryNameById}
          onEdit={(transaction) => {
            setEditing(transaction);
            setModalOpen(true);
          }}
          onDelete={setPendingDelete}
        />
      )}

      {meta && meta.totalPages > 1 && (
        <nav aria-label="Paginación de movimientos" className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
            disabled={page <= 1 || transactionsQuery.isFetching}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {meta.page} de {meta.totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((currentPage) => Math.min(meta.totalPages, currentPage + 1))}
            disabled={page >= meta.totalPages || transactionsQuery.isFetching}
          >
            Siguiente
          </Button>
        </nav>
      )}

      <TransactionFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSubmitCreate={handleCreate}
        onSubmitEdit={handleEdit}
        accounts={accounts}
        categories={categories}
        editing={editing}
      />

      <ConfirmationModal
        open={Boolean(pendingDelete)}
        onOpenChange={(isOpen) => !isOpen && setPendingDelete(null)}
        title="Eliminar movimiento"
        description={`¿Seguro que quieres eliminar este movimiento de ${
          pendingDelete ? formatCurrency(pendingDelete.amount, pendingDelete.currency) : ''
        }? Esta acción se puede deshacer restaurándolo.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
        variant="destructive"
        isLoading={deleteTransaction.isPending}
      />
    </div>
  );
}
