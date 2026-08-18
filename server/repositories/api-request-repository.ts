import { prisma } from "@/server/db/prisma";
import type { Prisma } from "@prisma/client";

export function findApiRequestsForProject(projectId: string) {
  return prisma.apiRequest.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: {
      assertions: true,
      executions: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

export function findApiRequestById(apiRequestId: string) {
  return prisma.apiRequest.findUnique({
    where: { id: apiRequestId },
    include: { assertions: true },
  });
}

export function countApiRequestsForUser(userId: string) {
  return prisma.apiRequest.count({
    where: { project: { members: { some: { userId } } } },
  });
}
