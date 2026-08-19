import * as projectRepository from "@/server/repositories/project-repository";
import { requireProjectAccess } from "@/server/auth/access-control";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { slugify } from "@/utils/slugify";
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from "@/features/projects/schemas/project-schemas";
import { prisma } from "@/server/db/prisma";

export async function listProjectsForUser(userId: string) {
  return projectRepository.findProjectsForUser(userId);
}

export async function countProjectsForUser(userId: string) {
  return projectRepository.countProjectsForUser(userId);
}

export async function getProject(userId: string, projectId: string) {
  await requireProjectAccess(userId, projectId, "VIEWER");
  return projectRepository.findProjectById(projectId);
}

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

async function ensureUniqueSlug(baseSlug: string): Promise<string> {
  let candidate = baseSlug || "project";
  let attempt = 1;

  while (await projectRepository.findProjectBySlug(candidate)) {
    attempt += 1;
    candidate = `${baseSlug}-${attempt}`;
    if (attempt > 50) {
      throw new ConflictError("Could not generate a unique project slug");
    }
  }

  return candidate;
}

export async function updateProject(userId: string, input: UpdateProjectInput) {
  await requireProjectAccess(userId, input.projectId, "ADMIN");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.project.update({
      where: { id: input.projectId },
      data: { name: input.name, description: input.description },
    });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "project.updated",
        targetType: "Project",
        targetId: input.projectId,
        projectId: input.projectId,
        metadata: { name: updated.name },
      },
    });

    return updated;
  });
}

export async function deleteProject(userId: string, projectId: string, confirmName: string) {
  await requireProjectAccess(userId, projectId, "OWNER");

  const project = await projectRepository.findProjectById(projectId);
  if (!project) {
    throw new NotFoundError("Project", projectId);
  }
  if (project.name !== confirmName) {
    throw new ValidationError("Type the exact project name to confirm deletion.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "project.deleted",
        targetType: "Project",
        targetId: projectId,
        projectId: null,
        metadata: { name: project.name },
      },
    });
    await tx.project.delete({ where: { id: projectId } });
  });
}
