import { prisma } from "@/server/db/prisma";
import type { Prisma } from "@prisma/client";

export function findRequirementsForProject(projectId: string) {
  return prisma.requirement.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  });
}

export function findRequirementById(requirementId: string) {
  return prisma.requirement.findUnique({
    where: { id: requirementId },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  });
}

export function createRequirement(data: Prisma.RequirementCreateInput) {
  return prisma.requirement.create({ data });
}

export function countRequirementsForUser(userId: string) {
  return prisma.requirement.count({
    where: { project: { members: { some: { userId } } } },
  });
}
