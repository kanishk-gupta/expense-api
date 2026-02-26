import type { GraphQLContext } from '../context.ts';
import { ACCESS_DENIED } from '../../messages.ts';

type TSortDirection = 'asc' | 'desc';

type TArgs = {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: TSortDirection;
};

export const transactions = async (
  _parent: unknown,
  { page = 1, pageSize = 10, sortBy = 'datetime', sortOrder = 'desc' }: TArgs,
  ctx: GraphQLContext
) => {
  if (!ctx.userId) { throw new Error(ACCESS_DENIED); }

  try {
    const pageOffset = pageSize * (page);
    const where = { userId: ctx.userId };
    const orderBy = { [sortBy]: sortOrder };

    const [totalCount, records] = await ctx.prisma.$transaction([
      ctx.prisma.transaction.count({ where }),
      ctx.prisma.transaction.findMany({
        where,
        take: pageSize,
        skip: pageOffset,
        orderBy
      })
    ]);

    return { totalCount, transactions: records }
  } catch (error) {
    console.log("ERROR in fetch transactions : ", error);
    return { totalCount: 0, transactions: [] }
  }
};

export default {
  transactions,
};