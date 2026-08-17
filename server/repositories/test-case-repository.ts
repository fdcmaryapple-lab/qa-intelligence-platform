import { prisma } from "@/server/db/prisma";
import type { Prisma } from "@prisma/client";

export function findTestCasesForProject(projectId: string) {
  return prisma.testCase.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: {
      requirement: { select: { id: true, title: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
}

export function findTestCaseById(testCaseId: string) {
  return prisma.testCase.findUnique({
    where: { id: testCaseId },
    include: {
      requirement: { select: { id: true, title: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
}

export function createTestCase(data: Prisma.TestCaseCreateInput) {
  return prisma.testCase.create({ data });
}

export function updateTestCase(testCaseId: string, data: Prisma.TestCaseUpdateInput) {
  return prisma.testCase.update({ where: { id: testCaseId }, data });
}

export function countTestCasesForUser(userId: string) {
  return prisma.testCase.count({
    where: { project: { members: { some: { userId } } } },
  });
}
