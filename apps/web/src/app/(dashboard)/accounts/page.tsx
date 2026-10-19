'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';

import { AccountCard } from '@/components/accounts/AccountCard';
import { AccountFormModal } from '@/components/accounts/AccountFormModal';
import { Button } from '@/components/ui/button';
import {
  useAccounts,
  useCreateAccount,
  useRecalculateAccount,
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Cuentas</h2>
          <p className="text-sm text-muted-foreground">Gestioná tus cuentas y saldos.</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus aria-hidden="true" className="mr-2 h-4 w-4" />
          Nueva cuenta
        </Button>
      </div>

      <div className="flex gap-2" aria-label="Filtrar cuentas">
        <Button
          type="button"
          variant={archived ? 'outline' : 'default'}
          aria-pressed={!archived}
          onClick={() => setArchived(false)}
        >
          Activas
        </Button>
        <Button
          type="button"
          variant={archived ? 'default' : 'outline'}
          aria-pressed={archived}
          onClick={() => setArchived(true)}
        >
          Archivadas
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
            {archived ? 'No hay cuentas archivadas.' : 'No hay cuentas todavía. Creá la primera.'}
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
