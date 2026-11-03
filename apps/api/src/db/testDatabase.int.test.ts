import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestDatabase } from '../../test/testDatabase.js';
import type { TestDatabase } from '../../test/testDatabase.js';

describe('the integration test database harness', () => {
  let first: TestDatabase;
  let second: TestDatabase;

  beforeAll(async () => {
    first = await createTestDatabase();
    second = await createTestDatabase();
  });

  afterAll(async () => {
    await first.close();
    await second.close();
  });

  it('gives each test file its own database', async () => {
    await first.prisma.$executeRawUnsafe('CREATE TABLE isolation_probe (id integer)');

    const inFirst = await first.prisma.$queryRaw<{ name: string | null }[]>`
      SELECT to_regclass('public.isolation_probe')::text AS name`;
    const inSecond = await second.prisma.$queryRaw<{ name: string | null }[]>`
      SELECT to_regclass('public.isolation_probe')::text AS name`;

    expect(inFirst[0]?.name).toBe('isolation_probe');
    expect(inSecond[0]?.name).toBeNull();
  });

  it('starts from the migrated schema, with pg_trgm enabled', async () => {
    const rows = await second.prisma.$queryRaw<{ similar: boolean }[]>`
      SELECT similarity('headphones', 'hedphones') > 0.3 AS similar`;

    expect(rows[0]?.similar).toBe(true);
  });
});
