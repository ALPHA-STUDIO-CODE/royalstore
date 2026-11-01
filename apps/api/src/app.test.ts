import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from './app.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SAME_ORIGIN = { Host: 'shop.test', Origin: 'https://shop.test' };

describe('GET /api/health', () => {
  it('returns 200 with { ok: true }', async () => {
    const response = await request(createApp()).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });
});

describe('unknown routes', () => {
  it('return 404 in the standard error shape', async () => {
    const response = await request(createApp()).get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: 'NOT_FOUND', message: expect.any(String), fields: {} },
    });
  });
});

describe('response headers', () => {
  it.each(['/api/health', '/api/does-not-exist'])('are set on %s', async (path) => {
    const response = await request(createApp()).get(path);

    expect(response.headers['x-request-id']).toMatch(UUID_PATTERN);
    expect(response.headers['strict-transport-security']).toContain('max-age=');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  it('do not reveal that the server runs Express', async () => {
    const response = await request(createApp()).get('/api/health');

    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});

describe('request ids', () => {
  it('are unique per request and never taken from the client', async () => {
    const app = createApp();

    const first = await request(app).get('/api/health').set('x-request-id', 'attacker-value');
    const second = await request(app).get('/api/health');

    expect(first.headers['x-request-id']).not.toBe('attacker-value');
    expect(first.headers['x-request-id']).not.toBe(second.headers['x-request-id']);
  });
});

describe('origin check on state-changing requests', () => {
  it.each(['post', 'put', 'patch', 'delete'] as const)(
    'rejects a %s from a different origin',
    async (method) => {
      const response = await request(createApp())
        [method]('/api/anything')
        .set('Origin', 'https://evil.example');

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    },
  );

  it('rejects an Origin of "null"', async () => {
    const response = await request(createApp()).post('/api/anything').set('Origin', 'null');

    expect(response.status).toBe(403);
  });

  it('accepts an Origin that matches the request host', async () => {
    const response = await request(createApp()).post('/api/anything').set(SAME_ORIGIN);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('accepts the host of APP_BASE_URL', async () => {
    const app = createApp({ appBaseUrl: 'https://royal-store.example.app' });

    const response = await request(app)
      .post('/api/anything')
      .set('Origin', 'https://royal-store.example.app');

    expect(response.status).toBe(404);
  });

  it('rejects a cross-site browser request that has no Origin', async () => {
    const response = await request(createApp())
      .post('/api/anything')
      .set('Sec-Fetch-Site', 'cross-site');

    expect(response.status).toBe(403);
  });

  it('accepts a request with no Origin from a non-browser client', async () => {
    const response = await request(createApp()).post('/api/anything');

    expect(response.status).toBe(404);
  });

  it('does not apply to GET requests', async () => {
    const response = await request(createApp())
      .get('/api/health')
      .set('Origin', 'https://evil.example');

    expect(response.status).toBe(200);
  });
});

describe('request bodies', () => {
  it('returns 400 for malformed JSON', async () => {
    const response = await request(createApp())
      .post('/api/anything')
      .set(SAME_ORIGIN)
      .set('Content-Type', 'application/json')
      .send('{not json');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 413 for a body over the size limit', async () => {
    const response = await request(createApp())
      .post('/api/anything')
      .set(SAME_ORIGIN)
      .send({ blob: 'x'.repeat(200_000) });

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});
