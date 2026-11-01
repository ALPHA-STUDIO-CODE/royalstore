import { createApp } from './app.js';

const DEFAULT_PORT = 3001;
const port = Number(process.env.PORT) || DEFAULT_PORT;

createApp({ appBaseUrl: process.env.APP_BASE_URL }).listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
