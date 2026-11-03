import { execSync } from 'node:child_process';

import {
  API_ROOT,
  TEMPLATE_DATABASE_NAME,
  requireTestDatabaseUrl,
  withAdminClient,
  withDatabaseName,
} from './databaseAdmin.js';

/** Builds a migrated template database once per test run. Each test file clones it. */
export async function setup(): Promise<void> {
  const serverUrl = requireTestDatabaseUrl();

  await withAdminClient(async (client) => {
    await client.query(`DROP DATABASE IF EXISTS "${TEMPLATE_DATABASE_NAME}" WITH (FORCE)`);
    await client.query(`CREATE DATABASE "${TEMPLATE_DATABASE_NAME}"`);
  });

  execSync('pnpm exec prisma migrate deploy', {
    cwd: API_ROOT,
    stdio: 'inherit',
    env: { ...process.env, DIRECT_URL: withDatabaseName(serverUrl, TEMPLATE_DATABASE_NAME) },
  });
}

export async function teardown(): Promise<void> {
  await withAdminClient(async (client) => {
    await client.query(`DROP DATABASE IF EXISTS "${TEMPLATE_DATABASE_NAME}" WITH (FORCE)`);
  });
}
