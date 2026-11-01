import express from 'express';
import type { Express } from 'express';

/** Builds the Express app without starting a server, so tests can call it directly. */
export function createApp(): Express {
  const app = express();

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  return app;
}
