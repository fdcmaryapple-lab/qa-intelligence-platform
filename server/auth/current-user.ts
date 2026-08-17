import { auth } from "@/auth";
import { UnauthorizedError } from "@/lib/errors";

/**
 * Resolves the signed-in user's ID from the current Auth.js session.
 *
 * This replaces the Phase 2 temporary stub (which always returned the
 * seeded demo user). Every service — project-service, requirement-service,
 * and every server action — was written to call this function rather than
 * touch a session or a hardcoded ID directly, specifically so this swap
 * would be the only place that needed to change.
 *
 * Throws UnauthorizedError if there's no session. In practice this should
 * rarely fire in the UI, since app/(dashboard)/layout.tsx already redirects
 * unauthenticated requests to /login before any service runs — this is a
 * defense-in-depth check for anything that calls a service directly
 * without going through that layout.
 */
export async function getCurrentUserId(): Promise<string> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  return session.user.id;
}
