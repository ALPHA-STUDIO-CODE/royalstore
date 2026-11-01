import { describe, expect, it } from 'vitest';

import { getClientIp } from './clientIp.js';
import type { ClientIpSource } from './clientIp.js';

function makeSource(headers: Record<string, string>, remoteAddress?: string): ClientIpSource {
  return { headers, socket: { remoteAddress } };
}

describe('getClientIp', () => {
  it('uses the header that Vercel sets', () => {
    const source = makeSource({ 'x-vercel-forwarded-for': '203.0.113.7' }, '10.0.0.1');

    expect(getClientIp(source)).toBe('203.0.113.7');
  });

  it('uses the first address when the header holds a list', () => {
    const source = makeSource({ 'x-vercel-forwarded-for': '203.0.113.7, 10.0.0.2' });

    expect(getClientIp(source)).toBe('203.0.113.7');
  });

  it('ignores headers a client can send', () => {
    const source = makeSource(
      { 'x-forwarded-for': '198.51.100.9', 'x-real-ip': '198.51.100.10' },
      '10.0.0.1',
    );

    expect(getClientIp(source)).toBe('10.0.0.1');
  });

  it('prefers the Vercel header over a client-sent x-forwarded-for', () => {
    const source = makeSource({
      'x-vercel-forwarded-for': '203.0.113.7',
      'x-forwarded-for': '198.51.100.9',
    });

    expect(getClientIp(source)).toBe('203.0.113.7');
  });

  it('falls back to the socket address when the header is empty', () => {
    const source = makeSource({ 'x-vercel-forwarded-for': '' }, '10.0.0.1');

    expect(getClientIp(source)).toBe('10.0.0.1');
  });

  it('returns "unknown" when nothing identifies the client', () => {
    expect(getClientIp(makeSource({}))).toBe('unknown');
  });
});
