import { GraphQLError } from 'graphql';

import { MAX_TRANSACTIONS } from '../../config/index.ts';
import {
  ACCESS_DENIED,
  TRANSACTION_DELETE_ERROR,
  TRANSACTION_DELETE_SUCCESS,
  TRANSACTION_UPDATE_ERROR,
  TRANSACTION_UPDATE_SUCCESS,
  TRANSACTIONS_CREATE_ERROR,
  TRANSACTIONS_CREATE_SUCCESS,
  TRANSACTIONS_EMPTY_ERROR,
} from '../../messages.ts';
import type { GraphQLContext } from '../context.ts';
import type { TInputGQL, TResponseGQL, TTransactionProps } from '../../types/index.d.ts';
import type { Prisma } from '../../generated/prisma/client.ts';

/**
 * Create multiple transactions at once
 */
const createTransactions = async (
  _parent: unknown, 
  { input }: TInputGQL<Prisma.TransactionCreateInput[]>, 
  context: GraphQLContext
): Promise<TResponseGQL<{ insertCount?: number }>> => {
  if (!context.userId) { throw new Error(ACCESS_DENIED); }

  if (!input.length) { throw new GraphQLError(TRANSACTIONS_EMPTY_ERROR) }
  if (input.length > MAX_TRANSACTIONS) { throw new GraphQLError(`Maximum ${MAX_TRANSACTIONS} transactions allowed per request`) }

  try {
    const transactions = input.map(txn => ({
      ...txn,
      userId: context.userId as string
    }));
    const result = await context.prisma.transaction.createMany({ data: transactions });
    return { success: true, message: TRANSACTIONS_CREATE_SUCCESS, insertCount: result.count };
  } catch (error: any) {
    console.log("ERROR in createTransactions : ", error);
    return { success: false, message: error?.message || TRANSACTIONS_CREATE_ERROR };
  }
};

/**
 * Update deatils of a transaction
 */
const updateTransaction = async (
  _parent: unknown, 
  { input }: TInputGQL<TTransactionProps & { txnId: string }>, 
  context: GraphQLContext
): Promise<TResponseGQL<{ transaction?: TTransactionProps }>> => {
  if (!context.userId) { throw new Error(ACCESS_DENIED); }
  try {
    const result = await context.prisma.transaction.update({
      where: { id: input.txnId, userId: context.userId },
      data: {
        amount: input.amount ?? undefined,
        datetime: input.datetime ?? undefined,
        type: input.type ?? undefined,
        note: input.note ?? null,
      }
    });
    return { success: true, message: TRANSACTION_UPDATE_SUCCESS, transaction: result };
  } catch (error) {
    console.log("ERROR in updateTransaction : ", error);
    return { success: false, message: TRANSACTION_UPDATE_ERROR };
  }
};

/**
 * Update deatils of a transaction
 */
const deleteTransaction = async (
  _parent: unknown, 
  { id }: { id: string }, 
  context: GraphQLContext
): Promise<TResponseGQL<{ deleted?: boolean }>> => {
  if (!context.userId) { throw new Error(ACCESS_DENIED); }
  try {
    await context.prisma.transaction.delete({
      where: { id: id, userId: context.userId }
    });
    return { success: true, message: TRANSACTION_DELETE_SUCCESS, deleted: true };
  } catch (error) {
    console.log("ERROR in deleteTransaction : ", error);
    return { success: false, message: TRANSACTION_DELETE_ERROR };
  }
};

export default {
  createTransactions,
  updateTransaction,
  deleteTransaction
};