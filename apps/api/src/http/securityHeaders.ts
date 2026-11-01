import type { RequestHandler } from 'express';

const TWO_YEARS_IN_SECONDS = 63_072_000;

/** HSTS, nosniff, frame protection and a Referrer-Policy (specification section 8). */
export const securityHeaders: RequestHandler = (_req, res, next) => {
  res.setHeader('Strict-Transport-Security', `max-age=${TWO_YEARS_IN_SECONDS}; includeSubDomains`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
};
