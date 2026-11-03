import { isConnectionError } from './connectionErrors.js';

export interface RetryOptions {
  /** Total number of tries, including the first one. */
  attempts: number;
  /** Wait before the second try. It doubles for each later try. */
  baseDelayMs: number;
  maxDelayMs: number;
  isRetryable: (error: unknown) => boolean;
}

/** A short retry that covers a Neon compute waking up (specification section 3.3). */
export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  attempts: 3,
  baseDelayMs: 250,
  maxDelayMs: 2000,
  isRetryable: isConnectionError,
};

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

/**
 * Runs an operation again after a retryable error, waiting longer each time.
 * Errors that are not retryable, and the last error once the tries run out, are thrown as is.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  overrides: Partial<RetryOptions> = {},
): Promise<T> {
  const { attempts, baseDelayMs, maxDelayMs, isRetryable } = {
    ...DEFAULT_RETRY_OPTIONS,
    ...overrides,
  };

  for (let attempt = 1; ; attempt += 1) {
    try {
      return await operation();
    } catch (error: unknown) {
      if (attempt >= attempts || !isRetryable(error)) throw error;
      await sleep(Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs));
    }
  }
}
