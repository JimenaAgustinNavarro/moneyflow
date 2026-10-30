export type RecurrenceType = 'INCOME' | 'EXPENSE';

export type RecurrenceFrequency =
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'YEARLY';

export interface Recurrence {
  id: string;
  userId: string;
  name: string;
  type: RecurrenceType;
  amount: string;
  currency: string;
  description: string | null;
  frequency: RecurrenceFrequency;
  dayOfPeriod: number | null;
  startDate: string;
  endDate: string | null;
  nextDueDate: string | null;
  active: boolean;
  accountId: string | null;
  accountName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateRecurrenceInput {
  name: string;
  type: RecurrenceType;
  amount: string;
  currency?: string;
  description?: string | null;
  frequency: RecurrenceFrequency;
  dayOfPeriod?: number | null;
  startDate: string;
  endDate?: string | null;
  accountId: string;
  categoryId?: string | null;
}

export interface UpdateRecurrenceInput {
  name?: string;
  type?: RecurrenceType;
  amount?: string;
  currency?: string;
  description?: string | null;
  frequency?: RecurrenceFrequency;
  dayOfPeriod?: number | null;
  startDate?: string;
  endDate?: string | null;
  accountId?: string;
  categoryId?: string | null;
}

export interface RecurrenceFilters {
  active?: boolean;
  type?: RecurrenceType;
  accountId?: string;
  categoryId?: string;
  includeDeleted?: boolean;
}

export interface RecurrenceListResponse {
  data: Recurrence[];
}
