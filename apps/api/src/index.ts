import { createApp } from './app.js';
import { createDatabaseFromEnv } from './db/fromEnv.js';

/** Entry point for Vercel. `server.ts` is the entry point for local development. */
export default createApp({
  appBaseUrl: process.env.APP_BASE_URL,
  database: createDatabaseFromEnv(),
});
