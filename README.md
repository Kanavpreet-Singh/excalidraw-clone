# Turborepo Starter Template

A Turborepo monorepo template with TypeScript, Next.js, and Node.js backends.

## Structure

### Apps (`apps/`)
- **web** - Next.js frontend application
- **http-backend** - Express.js REST API server
- **ws-backend** - WebSocket server

### Packages (`packages/`)
- **@repo/ui** - Shared React component library
- **@repo/eslint-config** - Shared ESLint configurations
- **@repo/typescript-config** - Shared TypeScript configurations

All packages/apps are 100% TypeScript.

## Getting Started

Install dependencies:
```sh
pnpm install
```

Build all apps:
```sh
pnpm run build
```

Run dev mode:
```sh
pnpm run dev
```
