export interface CreateTransferInput {
  originAccountId: string;
  destinationAccountId: string;
  amount: string;
  description?: string | null;
  date: string;
}

export interface TransferLeg {
  id: string;
  accountId: string;
  type: 'TRANSFER';
  amount: string;
  counterpartAccountId: string;
}

export interface TransferResponse {
  transferId: string;
  origin: TransferLeg;
  destination: TransferLeg;
}
