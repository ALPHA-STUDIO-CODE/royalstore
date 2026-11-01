# Royal Store

Online store built from Product and Technical Specification v1.2. See `docs/` for the specification, the build blueprint and the checklist.

## Requirements

- Node.js 20.19 or newer (22 recommended, see `.nvmrc`)
- pnpm 10

## Commands

- `pnpm install`: install all dependencies
- `pnpm dev`: start the web app (http://localhost:5173) and the API (http://localhost:3001)
- `pnpm check`: lint, format check, typecheck and tests (the same command CI runs)
- `pnpm format`: format all files with Prettier

## Layout

- `apps/web`: Vite, React, TypeScript (the shop and, later, the admin)
- `apps/api`: Express API in TypeScript
