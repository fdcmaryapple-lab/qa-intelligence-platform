import * as projectRepository from "@/server/repositories/project-repository";
import { requireProjectAccess } from "@/server/auth/access-control";
import { ConflictError } from "@/lib/errors";
import { slugify } from "@/utils/slugify";
import type { CreateProjectInput } from "@/features/projects/schemas/project-schemas";
import { prisma } from "@/server/db/prisma";

/** Projects the given user is a member of, most recently created first. */
export async function listProjectsForUser(userId: string) {
  return projectRepository.findProjectsForUser(userId);
}

export async function countProjectsForUser(userId: string) {
  return projectRepository.countProjectsForUser(userId);
}

/** A single project — throws NotFoundError/ForbiddenError via requireProjectAccess if the user can't see it. */
export async function getProject(userId: string, projectId: string) {
  await requireProjectAccess(userId, projectId, "VIEWER");
  return projectRepository.findProjectById(projectId);
}

/**
 * Creates a project and makes the creator its OWNER in a single
 * transaction — a project must never exist without at least one member,
 * or it becomes permanently inaccessible (no one would pass
 * requireProjectAccess for it).
 */
export async function createProject(userId: string, input: CreateProjectInput) {
  const baseSlug = slugify(input.name);
  const slug = await ensureUniqueSlug(baseSlug);

  return prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        name: input.name,
        description: input.description,
        slug,
        members: {
          create: { userId, role: "OWNER" },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "project.created",
        targetType: "Project",
        targetId: project.id,
        projectId: project.id,
        metadata: { name: project.name },
      },
    });

    return project;
  });
}

/** Appends a numeric suffix if the base slug is already taken, rather than failing the whole create. */
async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let candidate = baseSlug || "project";
  let attempt = 1;

  while (await projectRepository.findProjectBySlug(candidate)) {
    attempt += 1;
    candidate = `${baseSlug}-${attempt}`;
    if (attempt > 50) {
      // Astronomically unlikely, but a hard ceiling beats an infinite loop.
      throw new ConflictError("Could not generate a unique project slug");
    }
  }

  return candidate;
}
