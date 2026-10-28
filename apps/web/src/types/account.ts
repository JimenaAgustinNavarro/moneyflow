export type AccountType = 'CASH' | 'BANK' | 'WALLET' | 'CREDIT';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  initialBalance: string;
  balance: string;
  archived: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  initialBalance: string;
  currency?: string;
}

export interface UpdateAccountInput {
  name?: string;
  type?: AccountType;
  archived?: boolean;
}

export interface RecalculateResponse {
  id: string;
  balance: string;
  recalculatedAt: string;
}
