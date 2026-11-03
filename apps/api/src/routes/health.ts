import { Router } from 'express';

import { isConnectionError } from '../db/connectionErrors.js';
import type { Database } from '../db/database.js';
import { withRetry } from '../db/withRetry.js';
import type { RetryOptions } from '../db/withRetry.js';
import { ServiceUnavailableError } from '../http/errors.js';

export interface HealthRouterOptions {
  database: Database;
  retry?: Partial<RetryOptions> | undefined;
}

/**
 * GET /health never touches the database. GET /health/deep runs one light query, so the
 * uptime monitor can tell "the API is up" from "the database is reachable" (section 3.5).
 */
export function createHealthRouter({ database, retry }: HealthRouterOptions): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  router.get('/health/deep', async (_req, res) => {
    const startedAt = performance.now();

    try {
      await withRetry(() => database.ping(), retry);
    } catch (error: unknown) {
      throw isConnectionError(error) ? new ServiceUnavailableError() : error;
    }

    res.json({ ok: true, databaseMs: Math.round(performance.now() - startedAt) });
  });

  return router;
}
