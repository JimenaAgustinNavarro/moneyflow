'use client';

import { motion } from 'motion/react';
import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';

import { AccountCard } from '@/components/accounts/AccountCard';
import { AccountFormModal } from '@/components/accounts/AccountFormModal';
import { Button } from '@/components/ui/button';
import { Animated } from '@/components/ui/motion';
import {
  useAccounts,
  useCreateAccount,
  useRecalculateAccount,
  useRestoreAccount,
  useUpdateAccount,
} from '@/hooks/useAccounts';
import { formatCurrency } from '@/lib/format-currency';
import { ApiError } from '@/lib/api-client';
import type { Account, CreateAccountInput, UpdateAccountInput } from '@/types/account';

interface Notice {
  message: string;
  isError: boolean;
}

export default function AccountsPage() {
  const [archived, setArchived] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const accountsQuery = useAccounts(archived);
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const recalculateAccount = useRecalculateAccount();
  const restoreAccount = useRestoreAccount();

  const showError = (error: unknown, fallback: string) => {
    setNotice({
      message: error instanceof ApiError ? error.message : fallback,
      isError: true,
    });
  };

  const handleCreate = async (input: CreateAccountInput) => {
    await createAccount.mutateAsync(input);
    setNotice({ message: 'Cuenta creada.', isError: false });
  };

  const handleEdit = async (id: string, input: UpdateAccountInput) => {
    await updateAccount.mutateAsync({ id, input });
    setNotice({ message: 'Cuenta actualizada.', isError: false });
  };

  const handleToggleArchive = async (account: Account) => {
    try {
      await updateAccount.mutateAsync({
        id: account.id,
        input: { archived: !account.archived },
      });
      setNotice({
        message: account.archived ? 'Cuenta desarchivada.' : 'Cuenta archivada.',
        isError: false,
      });
    } catch (error) {
      showError(error, 'No se pudo cambiar el estado de la cuenta.');
    }
  };

  const handleRecalculate = async (account: Account) => {
    try {
      const result = await recalculateAccount.mutateAsync(account.id);
      setNotice({
        message: `Saldo recalculado: ${formatCurrency(result.balance, account.currency)}`,
        isError: false,
      });
    } catch (error) {
      showError(error, 'No se pudo recalcular el saldo.');
    }
  };

  const handleRestore = async (account: Account) => {
    try {
      await restoreAccount.mutateAsync(account.id);
      setNotice({ message: 'Cuenta restaurada.', isError: false });
    } catch (error) {
      showError(error, 'No se pudo restaurar la cuenta.');
    }
  };

  const openCreateModal = () => {
    setEditingAccount(null);
    setModalOpen(true);
  };

  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <Animated variant="fadeIn" className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Cuentas</h2>
          <p className="mt-1 text-sm text-muted-foreground">Administra tus cuentas y saldos.</p>
        </div>
        <Button
          onClick={openCreateModal}
          className="shadow-md shadow-primary/15 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/20"
        >
          <Plus aria-hidden="true" className="mr-2 h-4 w-4" />
          Nueva cuenta
        </Button>
      </Animated>

      <div className="relative inline-flex rounded-xl border border-border bg-muted p-1" aria-label="Filtrar cuentas">
        {!archived && (
          <motion.div
            layoutId="accounts-toggle"
            className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-background shadow-sm"
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
          />
        )}
        {archived && (
          <motion.div
            layoutId="accounts-toggle"
            className="absolute inset-y-1 right-1 w-[calc(50%-0.25rem)] rounded-lg bg-background shadow-sm"
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
          />
        )}

        <button
          type="button"
          className={`relative z-10 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            !archived ? 'text-foreground' : 'text-muted-foreground'
          }`}
          aria-pressed={!archived}
          onClick={() => setArchived(false)}
        >
          Activas
        </button>
        <button
          type="button"
          className={`relative z-10 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            archived ? 'text-foreground' : 'text-muted-foreground'
          }`}
          aria-pressed={archived}
          onClick={() => setArchived(true)}
        >
          Archivadas
        </button>
      </div>

      {notice && (
        <p
          role={notice.isError ? 'alert' : 'status'}
          className={`rounded-xl p-3 text-sm ${
            notice.isError ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
          }`}
        >
          {notice.message}
        </p>
      )}

      {accountsQuery.isPending && (
        <p role="status" className="text-sm text-muted-foreground">
          Cargando cuentas...
        </p>
      )}

      {accountsQuery.isError && (
        <p role="alert" className="text-sm text-destructive">
          {accountsQuery.error instanceof Error
            ? accountsQuery.error.message
            : 'No se pudieron cargar las cuentas.'}
        </p>
      )}

      {accountsQuery.isSuccess && accountsQuery.data.length === 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {archived ? 'No hay cuentas archivadas.' : 'No hay cuentas todavía. Crea la primera.'}
          </p>
          {!archived && (
            <Button variant="outline" asChild>
              <Link href="/dashboard">Volver al dashboard</Link>
            </Button>
          )}
        </div>
      )}

      {accountsQuery.isSuccess && accountsQuery.data.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {accountsQuery.data.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onEdit={openEditModal}
              onRecalculate={handleRecalculate}
              onToggleArchive={handleToggleArchive}
              onRestore={handleRestore}
              isRecalculating={
                recalculateAccount.isPending && recalculateAccount.variables === account.id
              }
            />
          ))}
        </div>
      )}

      <AccountFormModal
        open={modalOpen}
        account={editingAccount}
        onClose={() => {
          setModalOpen(false);
          setEditingAccount(null);
        }}
        onSubmitCreate={handleCreate}
        onSubmitEdit={handleEdit}
      />
    </div>
  );
}
