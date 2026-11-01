import express from 'express';
import type { Express } from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { z } from 'zod';

import { applyBaseMiddleware, applyErrorHandling } from './app.js';
import { ConflictError, RateLimitedError } from './http/errors.js';
import { validate } from './http/validate.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SAME_ORIGIN = { Host: 'shop.test', Origin: 'https://shop.test' };

/** Builds an app with the real middleware and error handlers around the given test routes. */
function buildTestApp(addRoutes: (app: Express) => void): Express {
  const app = express();
  applyBaseMiddleware(app, {});
  addRoutes(app);
  applyErrorHandling(app);
  return app;
}

let errorLog: MockInstance<typeof console.error>;

beforeEach(() => {
  errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('unexpected errors', () => {
  it('return a generic 500 with a request id and no stack trace', async () => {
    const app = buildTestApp((target) => {
      target.get('/boom', () => {
        throw new Error('database password is hunter2');
      });
    });

    const response = await request(app).get('/boom');
    const requestId = response.headers['x-request-id'];

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong', fields: {} },
    });
    expect(requestId).toMatch(UUID_PATTERN);
    expect(response.text).not.toContain('hunter2');
    expect(response.text).not.toContain('    at ');

    const logged = String(errorLog.mock.calls[0]?.[0]);
    expect(logged).toContain(requestId);
    expect(logged).not.toContain('    at ');
  });

  it('are also caught when an async handler rejects', async () => {
    const app = buildTestApp((target) => {
      target.get('/boom-async', async () => {
        throw new Error('async failure');
      });
    });

    const response = await request(app).get('/boom-async');

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
  });
});

describe('AppError', () => {
  it('is sent with its own status and message and is not logged as a server error', async () => {
    const app = buildTestApp((target) => {
      target.get('/conflict', () => {
        throw new ConflictError('This category still has products');
      });
    });

    const response = await request(app).get('/conflict');

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: { code: 'CONFLICT', message: 'This category still has products', fields: {} },
    });
    expect(errorLog).not.toHaveBeenCalled();
  });

  it('adds a Retry-After header for rate limits', async () => {
    const app = buildTestApp((target) => {
      target.get('/limited', () => {
        throw new RateLimitedError(120);
      });
    });

    const response = await request(app).get('/limited');

    expect(response.status).toBe(429);
    expect(response.headers['retry-after']).toBe('120');
    expect(response.body.error.code).toBe('RATE_LIMITED');
  });
});

describe('validate', () => {
  const itemSchema = z.object({
    name: z.string().trim().min(2),
    price: z.number().int().min(1),
  });

  const buildItemsApp = (): Express =>
    buildTestApp((target) => {
      target.post('/items', validate(itemSchema), (req, res) => {
        res.status(201).json(req.body);
      });
    });

  it('returns 400 with a message for each invalid field', async () => {
    const response = await request(buildItemsApp())
      .post('/items')
      .set(SAME_ORIGIN)
      .send({ name: 'a', price: 0 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');

    const { fields } = response.body.error;
    expect(Object.keys(fields).sort()).toEqual(['name', 'price']);
    expect(fields.name).toEqual(expect.any(String));
    expect(fields.price).toEqual(expect.any(String));
  });

  it('passes the parsed value on to the handler', async () => {
    const response = await request(buildItemsApp())
      .post('/items')
      .set(SAME_ORIGIN)
      .send({ name: '  Ada  ', price: 9000 });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ name: 'Ada', price: 9000 });
  });

  it('reports a missing body under _form', async () => {
    const response = await request(buildItemsApp()).post('/items').set(SAME_ORIGIN);

    expect(response.status).toBe(400);
    expect(Object.keys(response.body.error.fields)).toEqual(['_form']);
  });
});
