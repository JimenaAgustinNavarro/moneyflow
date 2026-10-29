export type TransferStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export interface Transfer {
  id: string;
  originAccountId: string;
  destinationAccountId: string;
  amount: string;
  currency: string;
  description: string | null;
  occurredAt: string;
  status: TransferStatus;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransferInput {
  originAccountId: string;
  destinationAccountId: string;
  amount: string;
  description?: string | null;
  date: string;
}

export interface UpdateTransferInput {
  originAccountId?: string;
  destinationAccountId?: string;
  amount?: string;
  description?: string | null;
  date?: string;
}

export interface TransferListResponse {
  data: Transfer[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface TransferResponse {
  data: Transfer;
}
