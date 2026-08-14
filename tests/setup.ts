import "@testing-library/jest-dom/vitest";
import { config } from "dotenv";
import { vi } from "vitest";

// Load .env.test if present, falling back to .env, so unit/integration
// tests never accidentally point at a real dev/prod database.
config({ path: ".env.test" });
config();

// Next.js augments NodeJS.ProcessEnv to mark NODE_ENV as readonly, so a
// direct `process.env.NODE_ENV = ...` assignment is a type error (and would
// throw at runtime in some Node versions too, since Next also freezes the
// property). vi.stubEnv is Vitest's supported way to set/override env vars
// for a test run — it goes through a setter, not a direct property
// assignment, so it isn't subject to that readonly restriction.
// Vitest already sets NODE_ENV to "test" by default; this just makes that
// explicit and keeps a `.env`-provided value if one is already set.
vi.stubEnv("NODE_ENV", process.env.NODE_ENV ?? "test");
