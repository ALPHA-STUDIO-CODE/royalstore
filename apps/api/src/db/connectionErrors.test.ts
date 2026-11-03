import { describe, expect, it } from 'vitest';

import { isConnectionError } from './connectionErrors.js';

const withCode = (code: string): Error => Object.assign(new Error('failed'), { code });

describe('isConnectionError', () => {
  it.each([
    ['a Prisma "cannot reach database" error', withCode('P1001'), true],
    ['a Prisma pool timeout', withCode('P2024'), true],
    ['a refused socket connection', withCode('ECONNREFUSED'), true],
    ['a PostgreSQL admin shutdown', withCode('57P01'), true],
    [
      'a Prisma initialization error code',
      Object.assign(new Error('x'), { errorCode: 'P1001' }),
      true,
    ],
    ['a terminated pg connection', new Error('Connection terminated unexpectedly'), true],
    ['a pg connect timeout', new Error('timeout exceeded when trying to connect'), true],
    [
      'a wrapped connection error',
      new Error('Query failed', { cause: withCode('ECONNRESET') }),
      true,
    ],
    ['a Prisma unique-constraint error', withCode('P2002'), false],
    ['a plain error', new Error('boom'), false],
    ['a string', 'ECONNREFUSED', false],
    ['null', null, false],
  ])('%s -> %s', (_label, error, expected) => {
    expect(isConnectionError(error)).toBe(expected);
  });
});
