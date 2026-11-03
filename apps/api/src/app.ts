import express from 'express';
import type { Express } from 'express';

import { unconfiguredDatabase } from './db/database.js';
import type { Database } from './db/database.js';
import type { RetryOptions } from './db/withRetry.js';
import { errorHandler, notFoundHandler } from './http/errorHandling.js';
import { createOriginCheck } from './http/originCheck.js';
import { requestId } from './http/requestId.js';
import { securityHeaders } from './http/securityHeaders.js';
import { createHealthRouter } from './routes/health.js';

const JSON_BODY_LIMIT = '100kb';

export interface CreateAppOptions {
  /** Public address of the site (APP_BASE_URL), accepted as an Origin for state-changing requests. */
  appBaseUrl?: string | undefined;
  /** The database. Without one, routes that need the database report that it is not configured. */
  database?: Database | undefined;
  /** Overrides for the connection retry, mainly so tests do not wait. */
  dbRetry?: Partial<RetryOptions> | undefined;
}

/** Middleware that runs before every route. */
export function applyBaseMiddleware(app: Express, options: CreateAppOptions): void {
  app.disable('x-powered-by');
  app.use(requestId);
  app.use(securityHeaders);
  app.use(createOriginCheck(options.appBaseUrl));
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
}

/** The 404 and error handlers. They must be added after every route. */
export function applyErrorHandling(app: Express): void {
  app.use(notFoundHandler);
  app.use(errorHandler);
}

/** Builds the Express app without starting a server, so tests can call it directly. */
export function createApp(options: CreateAppOptions = {}): Express {
  const app = express();

  applyBaseMiddleware(app, options);

  app.use(
    '/api',
    createHealthRouter({
      database: options.database ?? unconfiguredDatabase,
      retry: options.dbRetry,
    }),
  );

  applyErrorHandling(app);

  return app;
}
