import { requireProjectAccess } from "@/server/auth/access-control";
import { prisma } from "@/server/db/prisma";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface RiskFactor {
  label: string;
  points: number;
  maxPoints: number;
  detail: string;
}

export interface RequirementRisk {
  requirementId: string;
  requirementTitle: string;
  score: number;
  level: RiskLevel;
  factors: RiskFactor[];
}

const SEVERITY_WEIGHT: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 4, CRITICAL: 8 };
const BUG_SEVERITY_MAX_POINTS = 40;
const COVERAGE_MAX_POINTS = 20;
const REGRESSION_MAX_POINTS = 40;
const RESOLVED_BUG_STATUSES = new Set(["RESOLVED", "CLOSED", "WONT_FIX"]);
const FAILING_RESULT_STATUSES = new Set(["FAIL", "BLOCKED"]);

function levelForScore(score: number): RiskLevel {
  if (score >= 75) return "CRITICAL";
  if (score >= 50) return "HIGH";
  if (score >= 25) return "MEDIUM";
  return "LOW";
}

export async function computeProjectRisk(
  userId: string,
  projectId: string,
): Promise<RequirementRisk[]> {
  await requireProjectAccess(userId, projectId, "VIEWER");

  const requirements = await prisma.requirement.findMany({
    where: { projectId },
    include: {
      testCases: {
        include: {
          bugs: { select: { severity: true, status: true } },
          testRunResults: { orderBy: { executedAt: "desc" }, take: 1 },
        },
      },
    },
  });

  const risks = requirements.map((req): RequirementRisk => {
    const openBugs = req.testCases
      .flatMap((tc) => tc.bugs)
      .filter((b) => !RESOLVED_BUG_STATUSES.has(b.status));
    const bugSeveritySum = openBugs.reduce((sum, b) => sum + (SEVERITY_WEIGHT[b.severity] ?? 0), 0);
    const bugPoints = Math.min(BUG_SEVERITY_MAX_POINTS, bugSeveritySum * 2);

    let coveragePoints: number;
    let coverageDetail: string;
    if (req.testCases.length === 0) {
      coveragePoints = COVERAGE_MAX_POINTS;
      coverageDetail = "No test cases exist for this requirement.";
    } else {
      const draftCount = req.testCases.filter((tc) => tc.reviewStatus === "DRAFT").length;
      coveragePoints = Math.round((draftCount / req.testCases.length) * COVERAGE_MAX_POINTS);
      coverageDetail = `${draftCount} of ${req.testCases.length} test case(s) are still unreviewed drafts.`;
    }

    const testCasesWithRuns = req.testCases.filter((tc) => tc.testRunResults.length > 0);
    let regressionPoints = 0;
    let regressionDetail = "No regression run data yet for this requirement's test cases.";
    if (testCasesWithRuns.length > 0) {
      const failingCount = testCasesWithRuns.filter((tc) =>
        FAILING_RESULT_STATUSES.has(tc.testRunResults[0]!.result),
      ).length;
      regressionPoints = Math.round((failingCount / testCasesWithRuns.length) * REGRESSION_MAX_POINTS);
      regressionDetail = `${failingCount} of ${testCasesWithRuns.length} test case(s) most recently failed or were blocked in a regression run.`;
    }

    const score = Math.min(100, bugPoints + coveragePoints + regressionPoints);

    return {
      requirementId: req.id,
      requirementTitle: req.title,
      score,
      level: levelForScore(score),
      factors: [
        {
          label: "Open bug severity",
          points: bugPoints,
          maxPoints: BUG_SEVERITY_MAX_POINTS,
          detail:
            openBugs.length > 0
              ? `${openBugs.length} open bug(s) linked via this requirement's test cases.`
              : "No open bugs linked to this requirement's test cases.",
        },
        {
          label: "Test coverage gap",
          points: coveragePoints,
          maxPoints: COVERAGE_MAX_POINTS,
          detail: coverageDetail,
        },
        {
          label: "Recent regression failures",
          points: regressionPoints,
          maxPoints: REGRESSION_MAX_POINTS,
          detail: regressionDetail,
        },
      ],
    };
  });

  return risks.sort((a, b) => b.score - a.score);
}
