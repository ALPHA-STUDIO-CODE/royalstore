import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { withRetry } from './withRetry.js';

const connectionError = Object.assign(new Error("Can't reach database server"), {
  code: 'P1001',
});
const timing = { attempts: 4, baseDelayMs: 100, maxDelayMs: 250 };

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('withRetry', () => {
  it('returns the result without waiting when the first try works', async () => {
    const operation = vi.fn().mockResolvedValue('ok');

    await expect(withRetry(operation, timing)).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('tries again after a connection error and returns the later result', async () => {
    const operation = vi.fn().mockRejectedValueOnce(connectionError).mockResolvedValue('ok');

    const result = withRetry(operation, timing);
    expect(operation).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(100);

    await expect(result).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('waits longer before each new try, up to the maximum', async () => {
    const operation = vi.fn().mockRejectedValue(connectionError);

    const result = withRetry(operation, timing);
    const assertion = expect(result).rejects.toBe(connectionError);
    expect(operation).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(99);
    expect(operation).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(operation).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(199);
    expect(operation).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(operation).toHaveBeenCalledTimes(3);

    // The third wait would be 400 ms but is capped at 250 ms.
    await vi.advanceTimersByTimeAsync(249);
    expect(operation).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(1);
    expect(operation).toHaveBeenCalledTimes(4);

    await assertion;
  });

  it('throws the last error once the tries run out', async () => {
    const operation = vi.fn().mockRejectedValue(connectionError);

    const result = withRetry(operation, { ...timing, attempts: 2 });
    const assertion = expect(result).rejects.toBe(connectionError);
    await vi.advanceTimersByTimeAsync(10_000);

    await assertion;
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('throws an error that is not retryable straight away', async () => {
    const failure = new Error('syntax error in SQL');
    const operation = vi.fn().mockRejectedValue(failure);

    await expect(withRetry(operation, timing)).rejects.toBe(failure);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('uses a custom rule for which errors are retryable', async () => {
    const operation = vi.fn().mockRejectedValueOnce(new Error('flaky')).mockResolvedValue('ok');

    const result = withRetry(operation, { ...timing, isRetryable: () => true });
    await vi.advanceTimersByTimeAsync(100);

    await expect(result).resolves.toBe('ok');
  });
});
