import type { IncomingHttpHeaders } from 'node:http';

/** Set by Vercel itself; a client cannot choose its value. */
const VERCEL_CLIENT_IP_HEADER = 'x-vercel-forwarded-for';
const UNKNOWN_IP = 'unknown';

export interface ClientIpSource {
  headers: IncomingHttpHeaders;
  socket: { remoteAddress?: string | undefined };
}

/**
 * The visitor's address for rate limits and lockouts. Only the header Vercel sets is trusted:
 * x-forwarded-for and x-real-ip are ignored because a client can send them. Without the
 * header (local development) the socket address is used.
 */
export function getClientIp(source: ClientIpSource): string {
  const header = source.headers[VERCEL_CLIENT_IP_HEADER];
  const value = Array.isArray(header) ? header[0] : header;
  const firstAddress = value?.split(',')[0]?.trim();

  return firstAddress || source.socket.remoteAddress || UNKNOWN_IP;
}
