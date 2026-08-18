import { prisma } from "@/server/db/prisma";

export function findTestRunsForProject(projectId: string) {
  return prisma.testRun.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: {
      results: {
        include: { testCase: { select: { id: true, title: true } } },
      },
    },
  });
}

export function countTestRunsForUser(userId: string) {
  return prisma.testRun.count({
    where: { project: { members: { some: { userId } } } },
  });
}
