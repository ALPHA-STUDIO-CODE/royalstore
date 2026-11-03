import type { PrismaClient } from '../generated/prisma/client.js';

/** What the rest of the API needs from the database. Tests can replace it with a fake. */
export interface Database {
  /** Resolves when the database answers a trivial query and rejects when it does not. */
  ping(): Promise<void>;
}

export function createPrismaDatabase(prisma: PrismaClient): Database {
  return {
    async ping() {
      await prisma.$queryRaw`SELECT 1`;
    },
  };
}

/** Used when DATABASE_URL is missing, so the API still starts and /api/health still works. */
export const unconfiguredDatabase: Database = {
  ping: () => Promise.reject(new Error('DATABASE_URL is not set')),
};
