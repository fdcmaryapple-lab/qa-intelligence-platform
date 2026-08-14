import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { isAppError, InternalError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { isProduction } from "@/lib/env";

/**
 * Every API route handler returns one of these two shapes. Consistency
 * here means the frontend can write one response-handling helper instead
 * of guessing the shape per-endpoint.
 */
export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function apiSuccess<T>(data: T, init?: ResponseInit) {
  const body: ApiSuccess<T> = { success: true, data };
  return NextResponse.json(body, { status: 200, ...init });
}

export function apiCreated<T>(data: T) {
  const body: ApiSuccess<T> = { success: true, data };
  return NextResponse.json(body, { status: 201 });
}

/**
 * Maps any thrown value to the ApiFailure body shape. Extracted from
 * handleApiError so server actions (lib/action-response.ts) can reuse the
 * exact same mapping without duplicating it — actions return plain objects,
 * not NextResponse, so they can't call handleApiError directly.
 */
export function toFailureBody(error: unknown): ApiFailure {
  if (error instanceof ZodError) {
    return { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: error.flatten() } };
  }

  if (isAppError(error)) {
    if (error.statusCode >= 500) {
      logger.error({ err: error, code: error.code }, error.message);
    }
    return { success: false, error: { code: error.code, message: error.message, details: error.details } };
  }

  logger.error({ err: error }, "Unhandled error");
  const fallback = new InternalError();
  return {
    success: false,
    error: {
      code: fallback.code,
      message: isProduction ? fallback.message : String((error as Error)?.message ?? error),
    },
  };
}

/**
 * Central error-to-response mapper. Route handlers wrap their logic:
 *
 *   export async function POST(req: Request) {
 *     try {
 *       const input = parseOrThrow(schema, await req.json());
 *       const result = await someService.create(input);
 *       return apiCreated(result);
 *     } catch (error) {
 *       return handleApiError(error);
 *     }
 *   }
 *
 * Unexpected (non-AppError) errors are logged with full detail server-side
 * but return a generic message to the client — we never leak stack traces
 * or internal details in production responses.
 */
export function handleApiError(error: unknown) {
  const body = toFailureBody(error);
  const status = isAppError(error) ? error.statusCode : error instanceof ZodError ? 400 : 500;
  return NextResponse.json(body, { status });
}

/**
 * Wraps a service call in a try/catch that funnels every failure through
 * handleApiError, so individual route handlers stay one-liners.
 */
export async function withApiErrorHandling<T>(fn: () => Promise<T>) {
  try {
    const data = await fn();
    return apiSuccess(data);
  } catch (error) {
    return handleApiError(error);
  }
}
