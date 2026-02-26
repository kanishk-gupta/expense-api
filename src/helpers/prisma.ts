import { PrismaClient } from '../generated/prisma/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
export const prisma = new PrismaClient({ adapter }).$extends({
  result: {
    user: {
      fullname: {
        needs: { firstname: true, lastname: true },
        compute(user) {
          return `${user.firstname} ${user.lastname}`.trim()
        }
      }
    }
  }
});