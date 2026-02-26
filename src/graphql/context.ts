import type { Request } from 'express';
// import { PrismaClient } from '../generated/prisma/client.ts';
import { prisma } from '../helpers/index.ts';
import type { TTokenPayload } from '../types/index.d.ts';

export interface GraphQLContext {
  prisma: typeof prisma;
  userId?: string | undefined;
  user?: TTokenPayload;
};

type TContext = {
  req: Request
};

export const createContext = async ({ req }: TContext): Promise<GraphQLContext> => {
  return { prisma, userId: req.userId, user: req.user };
};