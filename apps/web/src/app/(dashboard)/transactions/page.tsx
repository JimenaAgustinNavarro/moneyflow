'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';

import { TransactionFilters } from '@/components/transactions/TransactionFilters';
import { TransactionFormModal } from '@/components/transactions/TransactionFormModal';
import { TransactionList } from '@/components/transactions/TransactionList';
import { TransferList } from '@/components/transfers/TransferList';
import { TransferModal } from '@/components/transfers/TransferModal';
import { Button } from '@/components/ui/button';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { useAccounts } from '@/hooks/useAccounts';
import { useCategories } from '@/hooks/useCategories';
import {
  useCreateTransaction,
  useDeleteTransaction,
  useTransactions,
  useUpdateTransaction,
} from '@/hooks/useTransactions';
import {
  useCreateTransfer,
  useDeleteTransfer,
  useTransfers,
  useUpdateTransfer,
} from '@/hooks/useTransfers';
import { ApiError } from '@/lib/api-client';
import { formatCurrency } from '@/lib/format-currency';
import type {
  CreateTransactionInput,
  Transaction,
  TransactionFilters as Filters,
  UpdateTransactionInput,
} from '@/types/transaction';
import type { CreateTransferInput, Transfer, UpdateTransferInput } from '@/types/transfer';

const PAGE_SIZE = 20;

export default function TransactionsPage() {
  const [filterValues, setFilterValues] = useState<Omit<Filters, 'page' | 'limit'>>({});
  const [page, setPage] = useState(1);
  const [transferPage, setTransferPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
  const [pendingCancelTransfer, setPendingCancelTransfer] = useState<Transfer | null>(null);
  const [notice, setNotice] = useState<{ message: string; isError: boolean } | null>(null);

  useEffect(() => {
    setPage(1);
    setTransferPage(1);
  }, [
    filterValues.accountId,
    filterValues.categoryId,
    filterValues.type,
    filterValues.status,
    filterValues.from,
    filterValues.to,
  ]);

  const filters: Filters = { ...filterValues, page, limit: PAGE_SIZE };
  const accountsQuery = useAccounts(false);
  const categoriesQuery = useCategories();
  const transactionsQuery = useTransactions(filters);
  const transfersQuery = useTransfers({
    accountId: filterValues.accountId,
    from: filterValues.from,
    to: filterValues.to,
    page: transferPage,
    limit: PAGE_SIZE,
  });
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const deleteTransaction = useDeleteTransaction();
  const createTransfer = useCreateTransfer();
  const updateTransfer = useUpdateTransfer();
  const deleteTransfer = useDeleteTransfer();

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

  const handleTransferSubmit = async (input: CreateTransferInput) => {
    if (editingTransfer) {
      const updateInput: UpdateTransferInput = input;
      await updateTransfer.mutateAsync({ id: editingTransfer.id, input: updateInput });
      setNotice({ message: 'Transferencia actualizada.', isError: false });
      return;
    }

    await createTransfer.mutateAsync(input);
    setNotice({ message: 'Transferencia creada.', isError: false });
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

  const confirmCancelTransfer = async () => {
    if (!pendingCancelTransfer) return;

    try {
      await deleteTransfer.mutateAsync(pendingCancelTransfer.id);
      setNotice({ message: 'Transferencia cancelada.', isError: false });
    } catch (error) {
      showError(error, 'No se pudo cancelar la transferencia.');
    } finally {
      setPendingCancelTransfer(null);
    }
  };

  const transactions = transactionsQuery.data?.data ?? [];
  const transactionMeta = transactionsQuery.data?.meta;
  const transfers = transfersQuery.data?.data ?? [];
  const transferMeta = transfersQuery.data?.meta;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Movimientos y transferencias</h1>
        <p className="text-sm text-muted-foreground">
          Registra y consulta tus ingresos, egresos y transferencias entre cuentas.
        </p>
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

      <section aria-labelledby="transactions-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 id="transactions-heading" className="text-xl font-semibold text-foreground">
              Movimientos
            </h2>
            <p className="text-sm text-muted-foreground">Ingresos y egresos.</p>
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

        <TransactionFilters
          filters={filters}
          accounts={accounts}
          categories={categories}
          onChange={(nextFilters) => {
            setFilterValues({
              accountId: nextFilters.accountId,
              categoryId: nextFilters.categoryId,
              type: nextFilters.type,
              status: nextFilters.status,
              from: nextFilters.from,
              to: nextFilters.to,
            });
            setPage(1);
          }}
          onReset={() => setFilterValues({})}
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

        {transactionMeta && transactionMeta.totalPages > 1 && (
          <nav aria-label="Paginación de movimientos" className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || transactionsQuery.isFetching}
            >
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {transactionMeta.page} de {transactionMeta.totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setPage((current) => Math.min(transactionMeta.totalPages, current + 1))
              }
              disabled={page >= transactionMeta.totalPages || transactionsQuery.isFetching}
            >
              Siguiente
            </Button>
          </nav>
        )}
      </section>

      <section aria-labelledby="transfers-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 id="transfers-heading" className="text-xl font-semibold text-foreground">
              Transferencias
            </h2>
            <p className="text-sm text-muted-foreground">Movimientos entre tus propias cuentas.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setEditingTransfer(null);
              setTransferModalOpen(true);
            }}
          >
            <Plus aria-hidden="true" className="mr-2 h-4 w-4" />
            Nueva transferencia
          </Button>
        </div>

        {transfersQuery.isPending && (
          <p role="status" className="text-sm text-muted-foreground">
            Cargando transferencias...
          </p>
        )}
        {transfersQuery.isError && (
          <p role="alert" className="text-sm text-destructive">
            {transfersQuery.error instanceof Error
              ? transfersQuery.error.message
              : 'No se pudieron cargar las transferencias.'}
          </p>
        )}
        {transfersQuery.isSuccess && (
          <TransferList
            transfers={transfers}
            accountNameById={accountNameById}
            onEdit={(transfer) => {
              setEditingTransfer(transfer);
              setTransferModalOpen(true);
            }}
            onCancel={setPendingCancelTransfer}
          />
        )}

        {transferMeta && transferMeta.totalPages > 1 && (
          <nav
            aria-label="Paginación de transferencias"
            className="flex items-center justify-between"
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTransferPage((current) => Math.max(1, current - 1))}
              disabled={transferPage <= 1 || transfersQuery.isFetching}
            >
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {transferMeta.page} de {transferMeta.totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setTransferPage((current) => Math.min(transferMeta.totalPages, current + 1))
              }
              disabled={transferPage >= transferMeta.totalPages || transfersQuery.isFetching}
            >
              Siguiente
            </Button>
          </nav>
        )}
      </section>

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

      <TransferModal
        open={transferModalOpen}
        onClose={() => {
          setTransferModalOpen(false);
          setEditingTransfer(null);
        }}
        onSubmit={handleTransferSubmit}
        accounts={accounts}
        editing={editingTransfer}
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

      <ConfirmationModal
        open={Boolean(pendingCancelTransfer)}
        onOpenChange={(isOpen) => !isOpen && setPendingCancelTransfer(null)}
        title="Cancelar transferencia"
        description={`¿Seguro que quieres cancelar esta transferencia de ${
          pendingCancelTransfer
            ? formatCurrency(pendingCancelTransfer.amount, pendingCancelTransfer.currency)
            : ''
        }? Se revertirán los saldos derivados de las cuentas.`}
        confirmLabel="Cancelar transferencia"
        cancelLabel="Volver"
        onConfirm={confirmCancelTransfer}
        variant="destructive"
        isLoading={deleteTransfer.isPending}
      />
    </div>
  );
}
