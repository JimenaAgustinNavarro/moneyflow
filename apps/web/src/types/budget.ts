export type BudgetPeriod = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export type BudgetStatus = 'UNDER_LIMIT' | 'NEAR_LIMIT' | 'OVER_LIMIT';

export interface BudgetCategory {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
}

export interface Budget {
  id: string;
  userId: string;
  name: string;
  limit: string;
  currency: string;
  periodType: BudgetPeriod;
  startDate: string;
  endDate: string | null;
  alertThreshold: number;
  active: boolean;
  categories: BudgetCategory[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateBudgetInput {
  name: string;
  limit: string;
  currency?: string;
  periodType: BudgetPeriod;
  startDate: string;
  endDate?: string | null;
  categoryIds: string[];
  alertThreshold?: number;
}

export interface UpdateBudgetInput {
  name?: string;
  limit?: string;
  currency?: string;
  periodType?: BudgetPeriod;
  startDate?: string;
  endDate?: string | null;
  categoryIds?: string[];
  alertThreshold?: number;
  active?: boolean;
}

export interface CopyBudgetInput {
  startDate: string;
  endDate?: string | null;
  name?: string;
}

export interface BudgetUsage {
  spent: string;
  limit: string;
  percentage: number;
  status: BudgetStatus;
  alertThreshold: number;
  period: { startDate: string; endDate: string | null };
}

export interface BudgetFilters {
  status?: BudgetStatus;
  active?: boolean;
  includeDeleted?: boolean;
}

export interface BudgetListResponse {
  data: Budget[];
}
