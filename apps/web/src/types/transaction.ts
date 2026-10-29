export type TransactionType = 'INCOME' | 'EXPENSE';
export type TransactionStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export interface Transaction {
  id: string;
  accountId: string;
  categoryId: string | null;
  type: TransactionType;
  amount: string;
  currency: string;
  description: string | null;
  date: string;
  status: TransactionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionFilters {
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface TransactionMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TransactionListResponse {
  data: Transaction[];
  meta: TransactionMeta;
}

export interface CreateTransactionInput {
  accountId: string;
  categoryId?: string | null;
  type: 'INCOME' | 'EXPENSE';
  amount: string;
  description?: string | null;
  date: string;
  status?: TransactionStatus;
}

export interface UpdateTransactionInput {
  accountId?: string;
  categoryId?: string | null;
  type?: 'INCOME' | 'EXPENSE';
  amount?: string;
  description?: string | null;
  date?: string;
  status?: TransactionStatus;
}
