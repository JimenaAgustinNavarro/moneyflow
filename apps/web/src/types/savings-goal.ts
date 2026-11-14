export type SavingsGoalStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type ContributionType = 'DEPOSIT' | 'WITHDRAWAL';

export interface GoalContribution {
  id: string;
  goalId: string;
  transactionId: string | null;
  amount: string;
  type: ContributionType;
  date: string;
  createdAt: string;
  deletedAt: string | null;
}

export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: string;
  currentAmount: string;
  percentage: number;
  targetDate: string | null;
  accountId: string | null;
  status: SavingsGoalStatus;
  contributions: GoalContribution[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateSavingsGoalInput {
  name: string;
  targetAmount: string;
  targetDate?: string | null;
  accountId?: string | null;
}

export interface UpdateSavingsGoalInput {
  name?: string;
  targetAmount?: string;
  targetDate?: string | null;
  accountId?: string | null;
  status?: SavingsGoalStatus;
}

export interface CreateGoalContributionInput {
  amount: string;
  date: string;
  type?: ContributionType;
  transactionId?: string | null;
}

export interface SavingsGoalFilters {
  status?: SavingsGoalStatus;
  includeDeleted?: boolean;
  page?: number;
  limit?: number;
}

export interface SavingsGoalListResponse {
  data: SavingsGoal[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
