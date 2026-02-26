import type { GraphQLContext } from './context.ts';
import { userMutations, transactionMutations } from './mutations/index.ts';
import { userQueries, transactionQueries } from './queries/index.ts';
import type { TUserProps } from '../types/index.d.ts';

export const resolvers = {
  User: {
    fullname: (parent: TUserProps) => {
      return `${parent.firstname} ${parent.lastname}`.trim()
    },
  },
  Query: {
    ...userQueries,
    ...transactionQueries
  },
  Mutation: {
    ...userMutations,
    ...transactionMutations
  }
};
