'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { AccountDetail } from '@/components/accounts/AccountDetail';
import { AccountFormModal } from '@/components/accounts/AccountFormModal';
import { RecentTransactions } from '@/components/accounts/RecentTransactions';
import { useAccount, useRecalculateAccount, useUpdateAccount } from '@/hooks/useAccounts';
import { ApiError } from '@/lib/api-client';
import { formatCurrency } from '@/lib/format-currency';
import type { Account, UpdateAccountInput } from '@/types/account';

interface Notice {
  message: string;
  isError: boolean;
}

export default function AccountDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const accountQuery = useAccount(id);
  const recalculateAccount = useRecalculateAccount();
  const updateAccount = useUpdateAccount();
  const [editOpen, setEditOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const handleRecalculate = async () => {
    if (!id || !accountQuery.data) {
      return;
    }

    try {
      const result = await recalculateAccount.mutateAsync(id);
      setNotice({
        message: `Saldo recalculado: ${formatCurrency(result.balance, accountQuery.data.currency)}`,
        isError: false,
      });
    } catch (error) {
      setNotice({
        message: error instanceof Error ? error.message : 'No se pudo recalcular el saldo.',
        isError: true,
      });
    }
  };

  const handleEdit = async (accountId: string, input: UpdateAccountInput) => {
    await updateAccount.mutateAsync({ id: accountId, input });
    setEditOpen(false);
    setNotice({ message: 'Cuenta actualizada.', isError: false });
  };

  if (accountQuery.isPending) {
    return (
      <p role="status" className="p-8 text-center text-sm text-muted-foreground">
        Cargando...
      </p>
    );
  }

  if (accountQuery.isError) {
    const isNotFound = accountQuery.error instanceof ApiError && accountQuery.error.status === 404;

    return (
      <div className="space-y-4 p-8 text-center">
        <p className="text-lg font-semibold text-foreground">
          {isNotFound ? 'Cuenta no encontrada' : 'Error al cargar la cuenta'}
        </p>
        <p className="text-sm text-muted-foreground">
          {isNotFound
            ? 'La cuenta no existe o fue eliminada.'
            : accountQuery.error instanceof Error
              ? accountQuery.error.message
              : 'Intenta de nuevo más tarde.'}
        </p>
        <Link href="/accounts" className="text-sm text-primary hover:underline">
          Volver a cuentas
        </Link>
      </div>
    );
  }

  const account: Account | undefined = accountQuery.data;
  if (!account) {
    return null;
  }

  return (
    <div className="space-y-6">
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
      <AccountDetail
        account={account}
        onEdit={() => setEditOpen(true)}
        onRecalculate={handleRecalculate}
        isRecalculating={recalculateAccount.isPending}
      />
      <RecentTransactions />
      <AccountFormModal
        open={editOpen}
        account={account}
        onClose={() => setEditOpen(false)}
        onSubmitCreate={async () => undefined}
        onSubmitEdit={handleEdit}
      />
    </div>
  );
}
