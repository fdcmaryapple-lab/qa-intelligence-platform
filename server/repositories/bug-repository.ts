import { prisma } from "@/server/db/prisma";
import type { Prisma } from "@prisma/client";

export function findBugsForProject(projectId: string) {
  return prisma.bug.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: {
      testCase: { select: { id: true, title: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
}

export function findBugById(bugId: string) {
  return prisma.bug.findUnique({
    where: { id: bugId },
    include: {
      testCase: { select: { id: true, title: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
}

export function createBug(data: Prisma.BugCreateInput) {
  return prisma.bug.create({ data });
}

export function updateBug(bugId: string, data: Prisma.BugUpdateInput) {
  return prisma.bug.update({ where: { id: bugId }, data });
}

export function countBugsForUser(userId: string) {
  return prisma.bug.count({
    where: { project: { members: { some: { userId } } } },
  });
}

export function countOpenBugsForUser(userId: string) {
  return prisma.bug.count({
    where: {
      project: { members: { some: { userId } } },
      status: { in: ["OPEN", "IN_PROGRESS"] },
    },
  });
}
