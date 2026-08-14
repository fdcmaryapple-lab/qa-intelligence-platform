import { z } from "zod";
import { ValidationError } from "@/lib/errors";

/**
 * Parses `input` against `schema`, throwing a typed ValidationError (caught
 * by handleApiError / server action error handling) instead of returning a
 * Zod result the caller has to remember to check.
 *
 * Use this at every boundary where untrusted input enters the system:
 * API route bodies, server action arguments, search params.
 */
export function parseOrThrow<S extends z.ZodTypeAny>(
  schema: S,
  input: unknown,
): z.infer<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError("Invalid input", result.error.flatten());
  }
  return result.data;
}
