export type ObligationType = 'INCOME' | 'EXPENSE';

export type ObligationStatus =
  | 'PENDING'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED';

export type ObligationPaymentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export interface ObligationPayment {
  id: string;
  obligationId: string;
  transactionId: string;
  amount: string;
  paidAt: string;
  status: ObligationPaymentStatus;
  createdAt: string;
}

export interface Obligation {
  id: string;
  userId: string;
  recurrenceId: string | null;
  accountId: string;
  accountName: string;
  categoryId: string | null;
  categoryName: string | null;
  name: string;
  type: ObligationType;
  amount: string;
  currency: string;
  description: string | null;
  dueDate: string;
  status: ObligationStatus;
  periodStart: string | null;
  periodEnd: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  payments: ObligationPayment[];
}

export interface CreateObligationInput {
  name: string;
  type: ObligationType;
  amount: string;
  currency?: string;
  description?: string | null;
  dueDate: string;
  accountId: string;
  categoryId?: string | null;
  recurrenceId?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
}

export interface UpdateObligationInput {
  name?: string;
  type?: ObligationType;
  amount?: string;
  currency?: string;
  description?: string | null;
  dueDate?: string;
  accountId?: string;
  categoryId?: string | null;
}

export interface PayObligationInput {
  amount?: string;
  paidAt?: string;
  accountId: string;
  description?: string;
}

export interface ObligationFilters {
  status?: ObligationStatus;
  from?: string;
  to?: string;
  overdue?: boolean;
  recurrenceId?: string;
  accountId?: string;
  categoryId?: string;
  includeDeleted?: boolean;
}

export interface ObligationListResponse {
  data: Obligation[];
}

export interface GenerateResult {
  generated: number;
  skipped: number;
}
