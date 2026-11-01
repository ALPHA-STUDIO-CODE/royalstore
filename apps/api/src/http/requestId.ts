import { randomUUID } from 'node:crypto';

import type { RequestHandler } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

/** Gives every request a fresh id. An id sent by the client is never trusted or reused. */
export const requestId: RequestHandler = (_req, res, next) => {
  const id = randomUUID();
  res.locals.requestId = id;
  res.setHeader(REQUEST_ID_HEADER, id);
  next();
};
