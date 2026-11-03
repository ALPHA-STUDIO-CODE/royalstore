import { createPrismaDatabase, unconfiguredDatabase } from './database.js';
import type { Database } from './database.js';
import { createPrismaClient } from './prismaClient.js';

/** Builds the database from DATABASE_URL (the pooled connection string on Neon). */
export function createDatabaseFromEnv(env: NodeJS.ProcessEnv = process.env): Database {
  const connectionString = env.DATABASE_URL;

  if (!connectionString) return unconfiguredDatabase;

  return createPrismaDatabase(createPrismaClient(connectionString));
}
