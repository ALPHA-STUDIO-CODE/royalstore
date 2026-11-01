import type { RequestHandler } from 'express';
import type { z } from 'zod';

import { ValidationError } from './errors.js';
import type { FieldErrors } from './errors.js';

/** Key used for problems that belong to the whole body rather than one field. */
const FORM_FIELD = '_form';

function collectFieldErrors(error: z.ZodError): FieldErrors {
  const messages = new Map<string, string>();

  for (const issue of error.issues) {
    const field = issue.path.length > 0 ? issue.path.map(String).join('.') : FORM_FIELD;
    if (!messages.has(field)) messages.set(field, issue.message);
  }

  return Object.fromEntries(messages);
}

/** Validates req.body with a Zod schema and replaces it with the parsed value. */
export function validate(schema: z.ZodType): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      next(new ValidationError(undefined, collectFieldErrors(result.error)));
      return;
    }

    req.body = result.data;
    next();
  };
}
