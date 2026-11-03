const MAX_CAUSE_DEPTH = 3;

/** Prisma and PostgreSQL codes, and Node socket codes, that mean "could not talk to the database". */
const CONNECTION_ERROR_CODES = new Set([
  'P1001', // Can't reach database server
  'P1002', // Database server timed out
  'P1008', // Operation timed out
  'P1017', // Server closed the connection
  'P2024', // Timed out fetching a connection from the pool
  'P2037', // Too many database connections
  '08000',
  '08001',
  '08003',
  '08006',
  '57P01', // Server shut down (Neon suspending an idle compute)
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EPIPE',
  'EAI_AGAIN',
]);

const CONNECTION_ERROR_MESSAGES = [
  /can't reach database server/i,
  /connection terminated/i,
  /timeout exceeded when trying to connect/i,
  /connection timeout/i,
];

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' ? value : undefined;
}

/** True when the error, or one of its causes, is a database connection problem worth retrying. */
export function isConnectionError(error: unknown, depth = 0): boolean {
  if (typeof error !== 'object' || error === null || depth > MAX_CAUSE_DEPTH) return false;

  const record = error as Record<string, unknown>;
  const code = readString(record, 'code') ?? readString(record, 'errorCode');
  if (code !== undefined && CONNECTION_ERROR_CODES.has(code)) return true;

  const message = readString(record, 'message');
  if (message !== undefined && CONNECTION_ERROR_MESSAGES.some((pattern) => pattern.test(message))) {
    return true;
  }

  return isConnectionError(record.cause, depth + 1);
}
