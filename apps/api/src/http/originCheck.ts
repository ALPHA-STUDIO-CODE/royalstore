import type { RequestHandler } from 'express';

import { ForbiddenError } from './errors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function hostOf(value: string): string | undefined {
  try {
    return new URL(value).host;
  } catch {
    return undefined;
  }
}

/**
 * CSRF defence for state-changing requests (specification section 8).
 * An Origin must match the request host or the host of APP_BASE_URL. A request without an
 * Origin is allowed unless the browser marks it as cross-site.
 */
export function createOriginCheck(appBaseUrl?: string): RequestHandler {
  const appHost = appBaseUrl ? hostOf(appBaseUrl) : undefined;

  return (req, _res, next) => {
    if (SAFE_METHODS.has(req.method)) {
      next();
      return;
    }

    const origin = req.get('origin');
    if (origin === undefined) {
      const isCrossSite = req.get('sec-fetch-site') === 'cross-site';
      next(isCrossSite ? new ForbiddenError() : undefined);
      return;
    }

    const originHost = hostOf(origin);
    const requestHost = req.get('host')?.toLowerCase();
    const isAllowed =
      originHost !== undefined && (originHost === requestHost || originHost === appHost);
    next(isAllowed ? undefined : new ForbiddenError());
  };
}
