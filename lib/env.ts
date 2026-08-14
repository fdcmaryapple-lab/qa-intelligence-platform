import { z } from "zod";

/**
 * Central, validated access point for environment variables.
 *
 * Import `env` instead of reading `process.env` directly anywhere in the
 * codebase. This gives us:
 *  - a single source of truth for what configuration the app needs
 *  - a fast, readable failure at startup if something is missing/malformed,
 *    instead of an obscure runtime error three layers deep
 *  - type-safe access (no `string | undefined` sprinkled everywhere)
 *
 * Server-only secrets (DATABASE_URL, OPENAI_API_KEY, AUTH_SECRET, ...) are
 * intentionally validated in a schema that is never imported into client
 * components. `clientEnv` below is the explicit, narrow allow-list of
 * values safe to ship to the browser.
 */

const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      (val) => val.startsWith("postgresql://") || val.startsWith("postgres://"),
      "DATABASE_URL must be a postgresql:// connection string",
    ),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url("NEXT_PUBLIC_APP_URL must be a valid URL")
    .default("http://localhost:3000"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  // Optional in Phase 1 — become required once their features land.
  AUTH_SECRET: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function loadServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    // Fail loudly and immediately. A misconfigured environment should
    // never result in the app starting in a half-working state.
    throw new Error(
      `Invalid environment configuration:\n${formatted}\n\nCheck your .env file against .env.example.`,
    );
  }

  return parsed.data;
}

export const env: ServerEnv = loadServerEnv();

/**
 * Explicit allow-list of environment values safe to expose to the browser.
 * Only NEXT_PUBLIC_* values belong here — never spread `env` wholesale.
 */
export const clientEnv = {
  appUrl: env.NEXT_PUBLIC_APP_URL,
} as const;

export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";
export const isTest = env.NODE_ENV === "test";
