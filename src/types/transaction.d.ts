export type TransactionType = "credit" | "debit";

export type TTransactionProps = {
  id?: string;
  amount: number;
  datetime: Date | string;
  type: TransactionType;
  note?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}
