# QA Intelligence Platform

An AI-powered quality engineering workspace for QA engineers, developers, and
engineering teams — requirement analysis, test case design, bug reporting,
API testing, Playwright automation generation, regression tracking, and
risk prediction in one place.

This is a portfolio-grade project built incrementally, phase by phase. See
`ARCHITECTURE.md` (or the architecture doc shared alongside this repo) for
the full system design and roadmap. **This README reflects Phase 1 —
Foundation only.**

## Features (Phase 1 scope)

- Landing, login, and register pages with client-side validated forms
  (React Hook Form + Zod)
- Dashboard shell with responsive sidebar navigation (desktop rail + mobile
  drawer) and dark/light mode
- Typed error handling and API response envelope shared by every route
- Zod-validated environment configuration, fails fast on misconfiguration
- Structured logging (pino)
- Prisma schema foundation: `User`, `Project`, `ProjectMember`, `AuditLog`
- Health-check endpoint (`/api/health`) that verifies DB connectivity
- Vitest unit tests + Playwright E2E tests
- Dockerized PostgreSQL for local development

> Authentication (Auth.js), AI features, and the remaining product modules
> (requirements, test cases, automation, risk prediction, ...) are **not**
> implemented yet — they arrive in later phases. Login/register forms
> validate input but don't yet create real sessions.

## Tech stack

| Layer      | Choice                                                        |
|------------|----------------------------------------------------------------|
| Frontend   | Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui-style components, React Hook Form, Zod, Recharts (added when charts land) |
| Backend    | Next.js API routes / server actions, TypeScript, Prisma ORM   |
| Database   | PostgreSQL                                                     |
| Auth       | Auth.js (arrives Phase 3)                                      |
| AI         | OpenAI API (arrives Phase 3)                                   |
| Testing    | Vitest (unit/integration), Playwright (E2E)                   |
| DevOps     | Docker, GitHub Actions                                         |

## Prerequisites

- Node.js 20+
- npm 10+
- Docker (for local PostgreSQL) — or a PostgreSQL 16 instance you already have running

## Installation

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables and fill in real values
cp .env.example .env

# 3. Start PostgreSQL (Docker)
npm run docker:db:up

# 4. Generate the Prisma client and apply migrations
npm run db:generate
npm run db:migrate

# 5. (Optional) seed local development data
npm run db:seed

# 6. Start the dev server
npm run dev
```

The app runs at http://localhost:3000. The health-check endpoint is at
http://localhost:3000/api/health.

## Environment setup

All variables are documented in `.env.example` and validated at startup by
`lib/env.ts` — the app refuses to start with a missing or malformed value
instead of failing unpredictably later.

| Variable              | Required in Phase 1 | Notes                                      |
|------------------------|:--------------------:|---------------------------------------------|
| `NODE_ENV`             | auto-defaulted       | `development` \| `test` \| `production`     |
| `DATABASE_URL`         | ✅                    | Postgres connection string                  |
| `NEXT_PUBLIC_APP_URL`  | auto-defaulted       | Base URL of the running app                  |
| `LOG_LEVEL`            | auto-defaulted       | `fatal`\|`error`\|`warn`\|`info`\|`debug`\|`trace` |
| `AUTH_SECRET`          | not yet               | Required starting Phase 3 (Auth.js)          |
| `OPENAI_API_KEY`       | not yet               | Required starting Phase 3 (AI features). Server-side only — never exposed to the browser. |

## Database setup

PostgreSQL runs via Docker Compose (`docker-compose.yml`), using credentials
that match `.env.example` out of the box:

```bash
npm run docker:db:up      # start Postgres in the background
npm run docker:db:down    # stop it
npm run db:migrate        # apply migrations (dev — creates a migration if the schema changed)
npm run db:migrate:deploy # apply migrations (CI/production — no schema drift allowed)
npm run db:studio         # open Prisma Studio to browse data
npm run db:seed           # insert a demo user + project
```

## Test commands

```bash
npm run test           # run unit + integration tests once (Vitest)
npm run test:watch     # watch mode
npm run test:coverage  # with coverage report
npm run test:e2e       # run Playwright E2E tests (builds and starts the app automatically)
npm run test:e2e:ui    # Playwright's interactive UI runner
```

## Development commands

```bash
npm run dev         # start the dev server
npm run build        # production build
npm run start        # run a production build
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit (strict mode)
npm run format         # Prettier, write mode
```

## Project structure

```
/app          Next.js App Router — routes, layouts, API route handlers
/components   /ui = shadcn-style primitives, /shared = composed app components
/features     Self-contained feature modules (UI + schemas + hooks + actions)
/lib          Cross-cutting utilities (env, logger, errors, api-response)
/server       Business logic: /db, /auth, /services, /repositories
/prisma       Schema, migrations, seed script
/types        Shared TypeScript types not owned by a single feature
/hooks        App-wide React hooks
/utils        Pure helper functions
/tests        Vitest unit + integration tests
/e2e          Playwright E2E specs
/public       Static assets
```

Business logic lives in `/server/services`; route handlers and server
actions stay thin (parse input, call a service, map errors to a response).

## Deployment

Not yet configured — arrives in the final phase of the roadmap (containerized
app + worker, managed Postgres, GitHub Actions CI/CD). See the architecture
document for the intended shape.
