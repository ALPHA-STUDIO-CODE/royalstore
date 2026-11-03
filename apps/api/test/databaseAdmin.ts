import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from 'dotenv';
import { Client } from 'pg';

export const API_ROOT = fileURLToPath(new URL('..', import.meta.url));
export const TEMPLATE_DATABASE_NAME = 'royal_store_test_template';

/** Reads the repository's .env file, if there is one. Variables that are already set win. */
export function loadTestEnv(): void {
  config({ path: path.resolve(API_ROOT, '../../.env'), quiet: true });
}

export function requireTestDatabaseUrl(): string {
  loadTestEnv();
  const url = process.env.TEST_DATABASE_URL;

  if (!url) {
    throw new Error(
      'TEST_DATABASE_URL is not set. Copy .env.example to .env and point it at your local PostgreSQL ' +
        '(see docs/database-setup.md).',
    );
  }

  return url;
}

/** The same server and login, with a different database name. */
export function withDatabaseName(connectionString: string, databaseName: string): string {
  const url = new URL(connectionString);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

/** Runs a function with a connection to the server's maintenance database. */
export async function withAdminClient<T>(run: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({
    connectionString: withDatabaseName(requireTestDatabaseUrl(), 'postgres'),
  });

  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}
