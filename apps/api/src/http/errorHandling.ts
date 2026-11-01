import type { ErrorRequestHandler, Request, RequestHandler, Response } from 'express';

import {
  AppError,
  InternalServerError,
  NotFoundError,
  PayloadTooLargeError,
  RateLimitedError,
  ValidationError,
} from './errors.js';

function hasBodyParserType(error: unknown, type: string): boolean {
  return typeof error === 'object' && error !== null && 'type' in error && error.type === type;
}

function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (hasBodyParserType(error, 'entity.parse.failed')) {
    return new ValidationError('The request body is not valid JSON');
  }
  if (hasBodyParserType(error, 'entity.too.large')) return new PayloadTooLargeError();
  return new InternalServerError();
}

/** One JSON line per server error. Stack traces are never logged. */
function logServerError(req: Request, res: Response, error: unknown): void {
  const isError = error instanceof Error;
  console.error(
    JSON.stringify({
      level: 'error',
      requestId: res.locals.requestId,
      method: req.method,
      path: req.path,
      errorName: isError ? error.name : 'NonError',
      message: isError ? error.message : String(error),
    }),
  );
}

/** Any request that reached the end of the route list. */
export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new NotFoundError());
};

/** Turns every error into the specification section 11.1 JSON shape. */
export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const appError = toAppError(error);
  if (appError.status >= 500) logServerError(req, res, error);
  if (appError instanceof RateLimitedError) {
    res.setHeader('Retry-After', String(appError.retryAfterSeconds));
  }

  res.status(appError.status).json({
    error: { code: appError.code, message: appError.message, fields: appError.fields },
  });
};
