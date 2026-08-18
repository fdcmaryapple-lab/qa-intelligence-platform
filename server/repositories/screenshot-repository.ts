import { prisma } from "@/server/db/prisma";

export function findBaselinesForProject(projectId: string) {
  return prisma.screenshotBaseline.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: {
      comparisons: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

export function findBaselineById(baselineId: string) {
  return prisma.screenshotBaseline.findUnique({ where: { id: baselineId } });
}

export function countBaselinesForUser(userId: string) {
  return prisma.screenshotBaseline.count({
    where: { project: { members: { some: { userId } } } },
  });
}
