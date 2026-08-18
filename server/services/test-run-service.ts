import * as testRunRepository from "@/server/repositories/test-run-repository";
import { requireProjectAccess } from "@/server/auth/access-control";
import { prisma } from "@/server/db/prisma";
import { NotFoundError } from "@/lib/errors";
import type { CreateTestRunInput } from "@/features/regression/schemas/regression-schemas";
import type { TestRunResultStatus } from "@prisma/client";

export async function listTestRuns(userId: string, projectId: string) {
  await requireProjectAccess(userId, projectId, "VIEWER");
  return testRunRepository.findTestRunsForProject(projectId);
}

export async function countTestRunsForUser(userId: string) {
  return testRunRepository.countTestRunsForUser(userId);
}

export async function createTestRun(userId: string, input: CreateTestRunInput) {
  await requireProjectAccess(userId, input.projectId, "EDITOR");

  return prisma.$transaction(async (tx) => {
    const testRun = await tx.testRun.create({
      data: {
        projectId: input.projectId,
        name: input.name,
        createdById: userId,
        results: {
          create: input.testCaseIds.map((testCaseId) => ({ testCaseId })),
        },
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "test_run.created",
        targetType: "TestRun",
        targetId: testRun.id,
        projectId: input.projectId,
        metadata: { name: testRun.name, testCaseCount: input.testCaseIds.length },
      },
    });

    return testRun;
  });
}

export async function recordResult(
  userId: string,
  testRunResultId: string,
  result: TestRunResultStatus,
  notes: string | undefined,
) {
  const existing = await prisma.testRunResult.findUnique({
    where: { id: testRunResultId },
    include: { testRun: { select: { projectId: true } } },
  });
  if (!existing) {
    throw new NotFoundError("TestRunResult", testRunResultId);
  }

  await requireProjectAccess(userId, existing.testRun.projectId, "EDITOR");

  return prisma.testRunResult.update({
    where: { id: testRunResultId },
    data: {
      result,
      notes,
      executedById: userId,
      executedAt: new Date(),
    },
  });
}

export async function completeTestRun(userId: string, testRunId: string) {
  const testRun = await prisma.testRun.findUnique({ where: { id: testRunId } });
  if (!testRun) {
    throw new NotFoundError("TestRun", testRunId);
  }

  await requireProjectAccess(userId, testRun.projectId, "EDITOR");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.testRun.update({
      where: { id: testRunId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "test_run.completed",
        targetType: "TestRun",
        targetId: testRunId,
        projectId: testRun.projectId,
        metadata: {},
      },
    });

    return updated;
  });
}
