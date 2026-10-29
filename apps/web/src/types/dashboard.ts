export type DashboardPeriod = 'month' | 'last_month' | 'last_3_months' | 'custom';

export interface DashboardPeriodRange {
  from: string;
  to: string;
}

export interface TopCategory {
  categoryId: string;
  categoryName: string;
  total: string;
  count: number;
}

export type TransactionType = 'INCOME' | 'EXPENSE';

export interface RecentTransaction {
  id: string;
  type: TransactionType;
  amount: string;
  currency: string;
  date: string;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
}

export interface DashboardSummary {
  period: DashboardPeriodRange;
  totalBalance: string;
  periodIncome: string;
  periodExpense: string;
  netFlow: string;
  topCategories: TopCategory[];
  recentTransactions: RecentTransaction[];
  committedMoney: null;
  upcomingPayments: [];
  topBudgets: [];
}

export interface DashboardFilters {
  period: DashboardPeriod;
  from?: string;
  to?: string;
  accountId?: string;
}
