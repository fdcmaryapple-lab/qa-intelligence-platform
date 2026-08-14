import { prisma } from "@/server/db/prisma";
import { InternalError } from "@/lib/errors";

/**
 * ⚠️ TEMPORARY — Phase 2 stub, replaced in Phase 3.
 *
 * Project management and requirements (Phase 2) need a concept of "the
 * signed-in user" to own projects and enforce ProjectMember roles, but
 * Auth.js isn't wired up until Phase 3. Rather than duplicate auth work
 * early or block Phase 2 on it, every service in this codebase resolves
 * the current user through this single function instead of ever reading
 * a session or a hardcoded ID directly.
 *
 * When Phase 3 lands, this function's *body* changes to read the Auth.js
 * session (`auth()` → `session.user.id`) and throw UnauthorizedError when
 * there isn't one. Nothing that calls getCurrentUserId() needs to change.
 *
 * For now, it resolves to the seeded demo user (see prisma/seed.ts).
 */
export async function getCurrentUserId(): Promise<string> {
  const demoUser = await prisma.user.findUnique({
    where: { email: "owner@example.com" },
    select: { id: true },
  });

  if (!demoUser) {
    throw new InternalError(
      "No demo user found — run `npm run db:seed` before using project/requirement features.",
    );
  }

  return demoUser.id;
}
