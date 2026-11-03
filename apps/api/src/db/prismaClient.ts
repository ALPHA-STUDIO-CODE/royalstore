import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client.js';

const POOL_MAX_CONNECTIONS = 5;
/** Long enough for a sleeping Neon compute to wake up (about 500 ms to a few seconds). */
const CONNECT_TIMEOUT_MS = 10_000;

/** Creates a Prisma client on the given connection string. It connects on first use. */
export function createPrismaClient(connectionString: string): PrismaClient {
  const adapter = new PrismaPg({
    connectionString,
    max: POOL_MAX_CONNECTIONS,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
  });

  return new PrismaClient({ adapter });
}
