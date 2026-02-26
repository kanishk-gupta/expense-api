import type { GraphQLContext } from '../context.ts';
import { ACCESS_DENIED} from '../../messages.ts';

export const profile = async (_parent: unknown, _args: unknown, ctx: GraphQLContext) => {
  if (!ctx.userId) { throw new Error(ACCESS_DENIED); }
  return ctx.prisma.user.findUnique({
    where: { id: ctx.userId }
  });
};

export default {
  profile,
};