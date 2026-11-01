import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import App from './App';

function stubFetch(respond: () => Promise<Response>): void {
  vi.stubGlobal('fetch', vi.fn(respond));
}

const healthyResponse = (): Promise<Response> =>
  Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('renders the Royal Store heading', () => {
    stubFetch(healthyResponse);

    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'Royal Store' })).toBeInTheDocument();
  });

  it('shows "checking" until the API has answered', () => {
    stubFetch(() => new Promise(() => undefined));

    render(<App />);

    expect(screen.getByRole('status')).toHaveTextContent('API status: checking');
  });

  it('shows the API as online when /api/health answers ok', async () => {
    stubFetch(healthyResponse);

    render(<App />);

    expect(await screen.findByText('API status: online')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith('/api/health', expect.anything());
  });

  it('shows the API as offline when the request fails', async () => {
    stubFetch(() => Promise.reject(new Error('network down')));

    render(<App />);

    expect(await screen.findByText('API status: offline')).toBeInTheDocument();
  });

  it('shows the API as offline when it answers with an error status', async () => {
    stubFetch(() => Promise.resolve(new Response('{}', { status: 503 })));

    render(<App />);

    expect(await screen.findByText('API status: offline')).toBeInTheDocument();
  });
});
