import { requireProjectAccess } from "@/server/auth/access-control";
import { prisma } from "@/server/db/prisma";

export interface BreakdownRow {
  name: string;
  count: number;
}

export interface ProjectReport {
  testCasesByReviewStatus: BreakdownRow[];
  bugsByStatus: BreakdownRow[];
  bugsBySeverity: BreakdownRow[];
  regressionResults: BreakdownRow[];
  apiExecutionResults: BreakdownRow[];
  automationValidity: BreakdownRow[];
}

export async function getProjectReport(userId: string, projectId: string): Promise<ProjectReport> {
  await requireProjectAccess(userId, projectId, "VIEWER");

  const [
    testCasesByReviewStatus,
    bugsByStatus,
    bugsBySeverity,
    regressionResults,
    apiExecutionResults,
    automationScripts,
  ] = await Promise.all([
    prisma.testCase.groupBy({
      by: ["reviewStatus"],
      where: { projectId },
      _count: { _all: true },
    }),
    prisma.bug.groupBy({
      by: ["status"],
      where: { projectId },
      _count: { _all: true },
    }),
    prisma.bug.groupBy({
      by: ["severity"],
      where: { projectId },
      _count: { _all: true },
    }),
    prisma.testRunResult.groupBy({
      by: ["result"],
      where: { testRun: { projectId } },
      _count: { _all: true },
    }),
    prisma.apiRequestExecution.groupBy({
      by: ["result"],
      where: { projectId },
      _count: { _all: true },
    }),
    prisma.automationScript.findMany({
      where: { projectId },
      select: { isValid: true },
    }),
  ]);

  const automationValidity: BreakdownRow[] = [
    { name: "Valid", count: automationScripts.filter((s) => s.isValid === true).length },
    { name: "Invalid", count: automationScripts.filter((s) => s.isValid === false).length },
    { name: "Not checked", count: automationScripts.filter((s) => s.isValid === null).length },
  ].filter((row) => row.count > 0);

  return {
    testCasesByReviewStatus: testCasesByReviewStatus.map((r) => ({
      name: r.reviewStatus,
      count: r._count._all,
    })),
    bugsByStatus: bugsByStatus.map((r) => ({ name: r.status, count: r._count._all })),
    bugsBySeverity: bugsBySeverity.map((r) => ({ name: r.severity, count: r._count._all })),
    regressionResults: regressionResults.map((r) => ({ name: r.result, count: r._count._all })),
    apiExecutionResults: apiExecutionResults.map((r) => ({ name: r.result, count: r._count._all })),
    automationValidity,
  };
}
