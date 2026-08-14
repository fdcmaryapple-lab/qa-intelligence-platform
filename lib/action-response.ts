import type { ApiResponse } from "@/lib/api-response";
import { toFailureBody } from "@/lib/api-response";

/**
 * Server actions can't return a NextResponse — they return plain,
 * serializable objects to the client. This gives every action the same
 * { success, data } / { success, error } shape API routes use, built from
 * the exact same error-mapping logic (toFailureBody), so a form handling a
 * failed server action and a fetch() handling a failed API route both work
 * the same way.
 */
export async function withActionErrorHandling<T>(fn: () => Promise<T>): Promise<ApiResponse<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    return toFailureBody(error);
  }
}
