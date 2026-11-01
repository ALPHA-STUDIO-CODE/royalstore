/** Stable machine-readable error codes (specification section 11.1). */
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE';

/** Per-field messages for forms, keyed by field path. */
export type FieldErrors = Record<string, string>;

/** An error whose status, code and message are safe to show to the caller. */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly fields: FieldErrors = {},
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Please check the information you entered', fields: FieldErrors = {}) {
    super(400, 'VALIDATION_ERROR', message, fields);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Please sign in to continue') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You are not allowed to do that') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'We could not find that') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'That change conflicts with the current data') {
    super(409, 'CONFLICT', message);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = 'That file or request is too large') {
    super(413, 'PAYLOAD_TOO_LARGE', message);
  }
}

export class UnsupportedMediaTypeError extends AppError {
  constructor(message = 'That file type is not supported') {
    super(415, 'UNSUPPORTED_MEDIA_TYPE', message);
  }
}

export class RateLimitedError extends AppError {
  constructor(
    readonly retryAfterSeconds: number,
    message = 'Too many attempts. Please try again later',
  ) {
    super(429, 'RATE_LIMITED', message);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Something went wrong') {
    super(500, 'INTERNAL_ERROR', message);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'The service is busy. Please try again in a moment') {
    super(503, 'SERVICE_UNAVAILABLE', message);
  }
}
