import { prisma } from "@/server/db/prisma";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import type { ProjectRole } from "@prisma/client";

/** Role hierarchy — index position is authority level, higher can do everything a lower role can. */
const ROLE_RANK: Record<ProjectRole, number> = {
  VIEWER: 0,
  EDITOR: 1,
  ADMIN: 2,
  OWNER: 3,
};

/**
 * The single place project-level authorization is checked. Every service
 * function that touches project-scoped data (requirements, test cases,
 * bugs, ...) calls this before doing anything else, instead of
 * hand-rolling its own membership query.
 *
 * Throws NotFoundError if the project doesn't exist (never leaks whether
 * a project ID exists to someone with no access to it — same response
 * shape either way), ForbiddenError if the user is a member but below
 * the required role.
 */
export async function requireProjectAccess(
  userId: string,
  projectId: string,
  minRole: ProjectRole = "VIEWER",
) {
  const membership = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
    select: { role: true },
  });

  if (!membership) {
    // Distinguish "project doesn't exist" from "you're not a member" only
    // for the error type, not the message — both return NotFoundError so
    // an unauthorized caller can't use the error to enumerate valid
    // project IDs they don't have access to.
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) {
      throw new NotFoundError("Project", projectId);
    }
    throw new ForbiddenError("You don't have access to this project");
  }

  if (ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
    throw new ForbiddenError(`This action requires the ${minRole} role or higher`);
  }

  return membership;
}
