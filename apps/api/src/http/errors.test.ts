import { describe, expect, it } from 'vitest';

import {
  AppError,
  ConflictError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  PayloadTooLargeError,
  RateLimitedError,
  ServiceUnavailableError,
  UnauthorizedError,
  UnsupportedMediaTypeError,
  ValidationError,
} from './errors.js';

describe('AppError subclasses', () => {
  it.each([
    [new ValidationError(), 400, 'VALIDATION_ERROR'],
    [new UnauthorizedError(), 401, 'UNAUTHORIZED'],
    [new ForbiddenError(), 403, 'FORBIDDEN'],
    [new NotFoundError(), 404, 'NOT_FOUND'],
    [new ConflictError(), 409, 'CONFLICT'],
    [new PayloadTooLargeError(), 413, 'PAYLOAD_TOO_LARGE'],
    [new UnsupportedMediaTypeError(), 415, 'UNSUPPORTED_MEDIA_TYPE'],
    [new RateLimitedError(60), 429, 'RATE_LIMITED'],
    [new InternalServerError(), 500, 'INTERNAL_ERROR'],
    [new ServiceUnavailableError(), 503, 'SERVICE_UNAVAILABLE'],
  ])('%o maps to status %i and code %s', (error, status, code) => {
    expect(error).toBeInstanceOf(AppError);
    expect(error.status).toBe(status);
    expect(error.code).toBe(code);
    expect(error.message.length).toBeGreaterThan(0);
  });

  it('keeps per-field messages on a ValidationError', () => {
    const error = new ValidationError('Please check the form', { name: 'Enter a name' });

    expect(error.fields).toEqual({ name: 'Enter a name' });
  });

  it('keeps the retry delay on a RateLimitedError', () => {
    expect(new RateLimitedError(90).retryAfterSeconds).toBe(90);
  });
});
