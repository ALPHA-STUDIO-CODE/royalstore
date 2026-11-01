import { useEffect, useState } from 'react';

export type ApiStatus = 'checking' | 'online' | 'offline';

const HEALTH_URL = '/api/health';

function isHealthy(body: unknown): boolean {
  return typeof body === 'object' && body !== null && 'ok' in body && body.ok === true;
}

/** Calls GET /api/health once and reports whether the API answered. */
export function useApiHealth(): ApiStatus {
  const [status, setStatus] = useState<ApiStatus>('checking');

  useEffect(() => {
    const controller = new AbortController();

    const check = async (): Promise<void> => {
      try {
        const response = await fetch(HEALTH_URL, { signal: controller.signal });
        const body: unknown = await response.json();
        if (controller.signal.aborted) return;
        setStatus(response.ok && isHealthy(body) ? 'online' : 'offline');
      } catch {
        if (!controller.signal.aborted) setStatus('offline');
      }
    };

    void check();

    return () => controller.abort();
  }, []);

  return status;
}
