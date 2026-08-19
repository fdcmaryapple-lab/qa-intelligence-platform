# QA Intelligence Platform

An AI-powered quality engineering workspace — requirements, test cases, bug
reports, API testing, Playwright automation (generation *and* real local
execution), regression tracking, visual/screenshot diffing, deterministic
risk scoring, QA analytics, a project-grounded AI assistant, and
role-based project administration, all in one place.

This is a portfolio-grade project built incrementally across **13 phases**,
each committed and CI-verified independently. See `ARCHITECTURE.md` (or the
architecture doc shared alongside this repo) for the full system design.
**This README reflects the completed roadmap, Phases 1–13.**

## Features

**Foundation & auth**
- Landing, login, and register pages (React Hook Form + Zod)
- Auth.js (Credentials provider, JWT sessions)
- Dashboard shell — responsive sidebar (desktop rail + mobile drawer),
  dark/light mode, project-context-aware navigation
- Typed error hierarchy + shared API/action response envelopes
- Zod-validated environment config, fails fast on misconfiguration
- Structured logging (pino), Dockerized PostgreSQL, health-check endpoint

**Core QA workflow**
- Projects with role-based membership (`VIEWER`/`EDITOR`/`ADMIN`/`OWNER`)
- Requirements, linked test cases, linked bugs
- AI-generated test cases (from a requirement) and bug reports (from a test
  case + observed behavior) — Claude, forced tool-use, human review
  workflow (`DRAFT` → `ACCEPTED`/`EDITED`/`REJECTED`)

**API testing**
- Saved, reusable API requests (any method, headers, query params, body)
- Server-side execution (works regardless of target CORS; reaches
  local/internal URLs) with an SSRF guard blocking cloud metadata
  endpoints while deliberately allowing localhost/private IPs
- Assertions (status/body/JSON-path) with pass/fail verdicts

**Automation**
- AI-generated or manually authored Playwright scripts, syntax-validated
  via the TypeScript compiler API (parses only — never executes)
- **Real local execution** (Phase 13): runs a saved script for real via a
  `npx playwright test` child process on your machine, captures
  exit code/stdout/stderr — genuine, unsandboxed code execution,
  appropriate only because this is a single-user local dev tool (see
  `server/automation/execute-script.ts` for the full reasoning);
  gated at `ADMIN`, a stricter bar than generating/saving a script

**Regression & visual testing**
- Regression runs — a checklist of test cases checked against a build,
  with PASS/FAIL/BLOCKED/SKIPPED recorded per test case
- Screenshot comparison — upload a baseline PNG, diff candidate uploads
  against it via real pixel-level comparison (`pixelmatch`/`pngjs`),
  with a rendered diff image and configurable fail threshold

**Insights**
- Risk Prediction — a deterministic 0–100 score per requirement from real
  signals (open bug severity, unreviewed test cases, regression failures).
  Deliberately **not** AI-generated — an LLM-invented risk score would be
  unverifiable in a tool people rely on; every point traces to real data
  and the full breakdown is shown, not just the number
- QA Reports — real charts (Recharts) over everything the app has
  accumulated: test case/bug breakdowns, all-time regression results, API
  execution outcomes, automation script validity
- AI QA Assistant — project-scoped chat grounded in real project data.
  Deliberately no tool-calling loop: each turn's system prompt is built
  server-side from a deterministic summary (reusing the risk/reports
  services), not from the model deciding what to query

**Administration**
- Project settings (rename/describe, `ADMIN`+) and deletion (type-to-confirm,
  `OWNER` only)
- Member management — add by email, change roles, remove members, with two
  hardening guards: granting `OWNER` requires already being an `OWNER`
  (no privilege escalation), and a project can never end up with zero
  `OWNER`s (both demotion and removal of the last one are blocked)
- Audit log viewer — every mutation across the whole app has written to
  `AuditLog` since Phase 1; this is simply the first UI to show it

## Tech stack

| Layer      | Choice                                                        |
|------------|----------------------------------------------------------------|
| Frontend   | Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui-style components, React Hook Form, Zod, Recharts |
| Backend    | Next.js API routes / server actions, TypeScript, Prisma ORM   |
| Database   | PostgreSQL                                                     |
| Auth       | Auth.js (Credentials provider, JWT sessions)                   |
| AI         | Anthropic Claude — forced tool-use for structured generation (test cases, bug reports, automation scripts), plain multi-turn chat for the AI Assistant |
| Automation | Playwright (script generation, syntax validation, and real local execution) |
| Image diff | pixelmatch + pngjs                                              |
| Testing    | Vitest (unit/integration), Playwright (E2E)                   |
| DevOps     | Docker, GitHub Actions                                         |

## Prerequisites

- Node.js 20+
- npm 10+
- Docker (for local PostgreSQL) — or a PostgreSQL 16 instance you already have running
- An Anthropic API key (console.anthropic.com/settings/keys) for AI features
- (Optional, for Automation Runs) Playwright's Chromium browser: `npx playwright install chromium`

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

| Variable              | Required? | Notes                                      |
|------------------------|:--------------------:|---------------------------------------------|
| `NODE_ENV`             | auto-defaulted       | `development` \| `test` \| `production`     |
| `DATABASE_URL`         | ✅                    | Postgres connection string                  |
| `NEXT_PUBLIC_APP_URL`  | auto-defaulted       | Base URL of the running app                  |
| `LOG_LEVEL`            | auto-defaulted       | `fatal`\|`error`\|`warn`\|`info`\|`debug`\|`trace` |
| `AUTH_SECRET`          | ✅                    | Required. Generate with `openssl rand -base64 32` |
| `ANTHROPIC_API_KEY`    | ✅                    | Required for all AI features (test case/bug/automation generation, AI Assistant). Get a key at console.anthropic.com/settings/keys |

> An earlier point in this project's history experimented with a
> provider-agnostic AI layer (Ollama/OpenAI/Anthropic). That work was
> fully reverted — the app is Anthropic-only, as reflected above.

## Demo login

After running `npm run db:seed`, you can sign in at `/login` with:

- **Email:** `owner@example.com`
- **Password:** `demo-password-123`

(Development/CI only — never a real credential, just seeded so the sign-in flow is exercisable without manually registering first.)

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

Business logic lives in `/server/services`; route handlers and server
actions stay thin (parse input, call a service, map errors to a response).

## Architecture patterns

A few conventions repeat across every feature — worth knowing before
extending any of them:

- **Layering**: `repository` (pure Prisma queries) → `service` (access
  control + business logic + orchestration) → `feature action` (parse
  input with Zod, call the service, map errors) → `page` (fetch via the
  service, render). Pages never call Prisma directly.
- **Access control**: `requireProjectAccess(userId, projectId, minRole)`
  enforces a role hierarchy (`VIEWER` < `EDITOR` < `ADMIN` < `OWNER`).
  Each service picks its own minimum — reading is usually `VIEWER`,
  creating/editing content is usually `EDITOR`, and genuinely consequential
  actions (project settings, member management, audit logs, **running**
  an automation script) are `ADMIN` or `OWNER`.
- **AI structured generation** (test cases, bug reports, automation
  scripts): a Zod schema is converted to a tool `input_schema`
  (`zod-to-json-schema`), the request forces that exact tool via
  `tool_choice`, and the model's output is re-validated against the same
  Zod schema before it ever touches the database. System prompts
  explicitly frame user-supplied content as data, not instructions, as a
  prompt-injection mitigation.
- **Server action responses**: every action goes through
  `withActionErrorHandling` + `parseOrThrow`, returning a consistent
  `{ success: true, data }` / `{ success: false, error }` shape the UI
  always handles the same way.
- **Audit logging**: mutations write an `AuditLog` row (actor, action,
  target, project, metadata); pure read views (Risk Prediction, QA
  Reports) deliberately don't, since nothing changed.

## Known, deliberately-scoped limitations

Documented in code (mostly as section-header comments in
`prisma/schema.prisma` and docblocks in the relevant service), not
silently skipped:

- **SSRF guard** (API testing): blocks cloud metadata endpoints by
  hostname/IP literal, not full DNS-resolution verification — doesn't
  defend against DNS rebinding. Fine for a single-user local tool.
- **Automation script validation**: TypeScript syntax check only
  (`ts.transpileModule`) — catches malformed code, not semantic/type
  errors against `@playwright/test`'s actual API.
- **Automation Runs execution**: genuine, unsandboxed code execution on
  your local machine. Safe only because the person running a script and
  the person who authored it are the same trust boundary — must not be
  exposed to untrusted scripts, multiple users, or any hosted deployment
  without real isolation (a fresh container per run, no network beyond
  the target app, hard resource limits) first.
- **Risk Prediction**: intentionally not AI-generated — a transparent
  heuristic, not a black box.
- **AI Assistant**: no tool-calling loop — grounded by a deterministic
  context summary the app builds, not by the model deciding what to
  query.
- **Screenshot comparison**: user-uploaded images only, no live browser
  screenshot capture (would mean navigating a headless browser to a
  user-supplied URL server-side — real infrastructure and a heavier
  version of the SSRF consideration above).

## Deployment

Not yet configured — arrives in the final phase of the roadmap (containerized
app + worker, managed Postgres, GitHub Actions CI/CD). See the architecture
document for the intended shape.

## Mobile Testing Setup (Appium) — optional, not yet integrated

This app's own automation features (Phase 7/13) generate and run
**Playwright** scripts against the web UI. The steps below are a separate,
optional setup guide for engineers who also want to do **native mobile**
(Android/iOS) test automation with **Appium** alongside this project —
nothing in the app currently generates, stores, or runs Appium/mocha tests;
this is prep documentation only, kept here for convenience.

1. Install Android Studio, VS Code, Appium Inspector, Node.js, JDK, and
   (macOS) Homebrew.
2. Set up `ANDROID_HOME`, `JAVA_HOME`, and `PATH` in `~/.zshrc`.
3. Install Appium globally and the `uiautomator2` (and/or `xcuitest`)
   driver.
4. Run `appium-doctor --android` and fix anything flagged before
   proceeding.
5. Accept Android SDK licenses with `sdkmanager --licenses`.
6. Enable Developer Options + USB debugging if using a physical device, or
   create an emulator via Android Studio's Device Manager.
7. Clone the project repo and run `npm install`.
8. Confirm your device/emulator is visible via `adb devices`.
9. Use Appium Inspector to find locators for any new screens.
10. Run tests with `npx mocha [testfile] --timeout 60000`.
