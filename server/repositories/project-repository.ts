import { prisma } from "@/server/db/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Repository layer: Prisma queries only, no authorization checks and no
 * business rules — those live in server/services. Keeping this split means
 * every query here is trivially testable in isolation and services can be
 * unit-tested with this whole module mocked out.
 */

export function findProjectsForUser(userId: string) {
  return prisma.project.findMany({
    where: { members: { some: { userId } } },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { requirements: true, members: true } },
    },
  });
}

export function findProjectById(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      _count: { select: { requirements: true, members: true } },
    },
  });
}

export function findProjectBySlug(slug: string) {
  return prisma.project.findUnique({ where: { slug } });
}

export function createProject(data: Prisma.ProjectCreateInput) {
  return prisma.project.create({ data });
}

export function countProjectsForUser(userId: string) {
  return prisma.project.count({ where: { members: { some: { userId } } } });
}
