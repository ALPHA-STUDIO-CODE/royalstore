import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';
import type { Database } from '../db/database.js';

const connectionError = Object.assign(new Error("Can't reach database server"), {
  code: 'P1001',
});
const fastRetry = { attempts: 3, baseDelayMs: 1, maxDelayMs: 2 };

function stubDatabase(ping: () => Promise<void>): Database & { ping: ReturnType<typeof vi.fn> } {
  return { ping: vi.fn(ping) };
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/health/deep', () => {
  it('returns 200 and the time the database took when it answers', async () => {
    const database = stubDatabase(() => Promise.resolve());

    const response = await request(createApp({ database })).get('/api/health/deep');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, databaseMs: expect.any(Number) });
    expect(database.ping).toHaveBeenCalledTimes(1);
  });

  it('still answers 200 when a later try succeeds', async () => {
    let calls = 0;
    const database = stubDatabase(() => {
      calls += 1;
      return calls === 1 ? Promise.reject(connectionError) : Promise.resolve();
    });

    const response = await request(createApp({ database, dbRetry: fastRetry })).get(
      '/api/health/deep',
    );

    expect(response.status).toBe(200);
    expect(database.ping).toHaveBeenCalledTimes(2);
  });

  it('retries briefly and then returns the 503 envelope when the database is unreachable', async () => {
    const database = stubDatabase(() => Promise.reject(connectionError));

    const response = await request(createApp({ database, dbRetry: fastRetry })).get(
      '/api/health/deep',
    );

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: { code: 'SERVICE_UNAVAILABLE', message: expect.any(String), fields: {} },
    });
    expect(response.headers['x-request-id']).toBeDefined();
    expect(database.ping).toHaveBeenCalledTimes(fastRetry.attempts);
  });

  it('does not retry an error that is not a connection problem', async () => {
    const database = stubDatabase(() => Promise.reject(new Error('relation does not exist')));

    const response = await request(createApp({ database, dbRetry: fastRetry })).get(
      '/api/health/deep',
    );

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
    expect(response.text).not.toContain('relation does not exist');
    expect(database.ping).toHaveBeenCalledTimes(1);
  });

  it('reports a server error, without details, when no database is configured', async () => {
    const response = await request(createApp()).get('/api/health/deep');

    expect(response.status).toBe(500);
    expect(response.text).not.toContain('DATABASE_URL');
  });

  it('leaves GET /api/health independent of the database', async () => {
    const database = stubDatabase(() => Promise.reject(connectionError));

    const response = await request(createApp({ database })).get('/api/health');

    expect(response.status).toBe(200);
    expect(database.ping).not.toHaveBeenCalled();
  });
});
