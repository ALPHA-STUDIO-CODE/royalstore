import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

config({ path: '../../.env', quiet: true });

// `prisma generate` never connects, so a placeholder lets it run without a .env file.
const GENERATE_ONLY_URL = 'postgresql://placeholder:placeholder@localhost:5432/placeholder';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    // The CLI uses the direct connection; the app itself uses DATABASE_URL (pooled on Neon).
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? GENERATE_ONLY_URL,
  },
});
