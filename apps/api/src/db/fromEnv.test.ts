import { describe, expect, it } from 'vitest';

import { createDatabaseFromEnv } from './fromEnv.js';

describe('createDatabaseFromEnv', () => {
  it('returns a database that reports the missing setting when DATABASE_URL is not set', async () => {
    const database = createDatabaseFromEnv({});

    await expect(database.ping()).rejects.toThrow('DATABASE_URL is not set');
  });

  it('does not connect until the database is used', () => {
    const env = { DATABASE_URL: 'postgresql://user:pass@127.0.0.1:1/unused' };

    expect(() => createDatabaseFromEnv(env)).not.toThrow();
  });
});
