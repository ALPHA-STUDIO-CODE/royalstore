import { randomUUID } from 'node:crypto';

import { createPrismaClient } from '../src/db/prismaClient.js';
import type { PrismaClient } from '../src/generated/prisma/client.js';
import {
  TEMPLATE_DATABASE_NAME,
  requireTestDatabaseUrl,
  withAdminClient,
  withDatabaseName,
} from './databaseAdmin.js';

/** PostgreSQL error code for "the template database is being copied by someone else". */
const OBJECT_IN_USE = '55006';
const CREATE_ATTEMPTS = 30;
const CREATE_RETRY_DELAY_MS = 100;

export interface TestDatabase {
  url: string;
  prisma: PrismaClient;
  /** Disconnects and drops the database. */
  close(): Promise<void>;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function isObjectInUse(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && 'code' in error && error.code === OBJECT_IN_USE
  );
}

async function cloneTemplate(name: string): Promise<void> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await withAdminClient((client) =>
        client.query(`CREATE DATABASE "${name}" TEMPLATE "${TEMPLATE_DATABASE_NAME}"`),
      );
      return;
    } catch (error: unknown) {
      // Two test files cloning the template at the same moment is normal; try again shortly.
      if (!isObjectInUse(error) || attempt >= CREATE_ATTEMPTS) throw error;
      await sleep(CREATE_RETRY_DELAY_MS);
    }
  }
}

/** Creates a fresh, migrated database for one test file. */
export async function createTestDatabase(): Promise<TestDatabase> {
  const name = `royal_store_test_${randomUUID().replaceAll('-', '')}`;
  await cloneTemplate(name);

  const url = withDatabaseName(requireTestDatabaseUrl(), name);
  const prisma = createPrismaClient(url);

  return {
    url,
    prisma,
    async close() {
      await prisma.$disconnect();
      await withAdminClient((client) =>
        client.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`),
      );
    },
  };
}
