/**
 * Typed application error hierarchy.
 *
 * Every error that should produce a specific, predictable API response
 * extends AppError. Route handlers / server actions catch AppError (via
 * lib/api-response.ts's `handleServiceError`) and map it to the right
 * HTTP status + error code. Anything that isn't an AppError is treated as
 * an unexpected 500 and logged with full detail — but never leaked to the
 * client in production.
 */

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "AI_GENERATION_FAILED"
  | "INTERNAL_ERROR";

export abstract class AppError extends Error {
  abstract readonly code: ErrorCode;
  abstract readonly statusCode: number;

  /** Additional structured detail, safe to return to the client (e.g. field-level validation errors). */
  readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  readonly code = "VALIDATION_ERROR" as const;
  readonly statusCode = 400;
}

export class NotFoundError extends AppError {
  readonly code = "NOT_FOUND" as const;
  readonly statusCode = 404;

  constructor(resource: string, id?: string) {
    super(id ? `${resource} not found: ${id}` : `${resource} not found`);
  }
}

export class UnauthorizedError extends AppError {
  readonly code = "UNAUTHORIZED" as const;
  readonly statusCode = 401;

  constructor(message = "Authentication required") {
    super(message);
  }
}

export class ForbiddenError extends AppError {
  readonly code = "FORBIDDEN" as const;
  readonly statusCode = 403;

  constructor(message = "You don't have access to this resource") {
    super(message);
  }
}

export class ConflictError extends AppError {
  readonly code = "CONFLICT" as const;
  readonly statusCode = 409;
}

export class RateLimitedError extends AppError {
  readonly code = "RATE_LIMITED" as const;
  readonly statusCode = 429;

  constructor(message = "Too many requests, please try again shortly") {
    super(message);
  }
}

export class AiGenerationError extends AppError {
  readonly code = "AI_GENERATION_FAILED" as const;
  readonly statusCode = 502;
}

export class InternalError extends AppError {
  readonly code = "INTERNAL_ERROR" as const;
  readonly statusCode = 500;

  constructor(message = "Something went wrong") {
    super(message);
  }
}

/** Type guard used by API/error-mapping utilities. */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
