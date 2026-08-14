import pino from "pino";
import { env, isDevelopment } from "@/lib/env";

/**
 * App-wide structured logger.
 *
 * - In development: human-readable, colorized output (pino-pretty).
 * - In production: newline-delimited JSON, suitable for ingestion by any
 *   log aggregator (CloudWatch, Datadog, etc.) without extra parsing.
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.info({ userId }, "user logged in");
 *   const requestLogger = logger.child({ requestId });
 *
 * Never log secrets (API keys, passwords, tokens, full request bodies that
 * might contain them). Prefer structured fields over string interpolation
 * so logs stay queryable.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: "qa-intelligence-platform" },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: isDevelopment
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss",
          ignore: "pid,hostname,service",
        },
      }
    : undefined,
});

/** Creates a child logger scoped to a request, job, or feature for correlated logs. */
export function createScopedLogger(scope: string, context?: Record<string, unknown>) {
  return logger.child({ scope, ...context });
}
