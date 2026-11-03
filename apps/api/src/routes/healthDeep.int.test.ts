import request from 'supertest';
import { afterAll, beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';
import { createPrismaDatabase } from '../db/database.js';
import { createPrismaClient } from '../db/prismaClient.js';
import { createTestDatabase } from '../../test/testDatabase.js';
import type { TestDatabase } from '../../test/testDatabase.js';

describe('GET /api/health/deep with a real database', () => {
  let testDatabase: TestDatabase;

  beforeAll(async () => {
    testDatabase = await createTestDatabase();
  });

  afterAll(async () => {
    await testDatabase.close();
  });

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 200 when the database answers', async () => {
    const app = createApp({ database: createPrismaDatabase(testDatabase.prisma) });

    const response = await request(app).get('/api/health/deep');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, databaseMs: expect.any(Number) });
  });

  it('returns 503 when nothing is listening at the database address', async () => {
    const unreachable = createPrismaClient('postgresql://postgres:postgres@127.0.0.1:1/nothing');
    const app = createApp({
      database: createPrismaDatabase(unreachable),
      dbRetry: { attempts: 2, baseDelayMs: 1, maxDelayMs: 2 },
    });

    const response = await request(app).get('/api/health/deep');
    await unreachable.$disconnect();

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
  });
});
