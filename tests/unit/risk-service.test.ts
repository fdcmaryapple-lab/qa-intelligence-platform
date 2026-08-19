import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenError } from "@/lib/errors";
import * as accessControl from "@/server/auth/access-control";
import { prisma } from "@/server/db/prisma";
import { computeProjectRisk } from "@/server/services/risk-service";

vi.mock("@/server/auth/access-control");
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    requirement: { findMany: vi.fn() },
  },
}));

describe("computeProjectRisk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires at least VIEWER access on the project", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockRejectedValue(new ForbiddenError());

    await expect(computeProjectRisk("user_1", "proj_1")).rejects.toThrow(ForbiddenError);
  });

  it("scores a requirement with no test cases as fully at-risk on coverage", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "VIEWER" } as never);
    vi.mocked(prisma.requirement.findMany).mockResolvedValue([
      { id: "req_1", title: "Untested requirement", testCases: [] },
    ] as never);

    const [risk] = await computeProjectRisk("user_1", "proj_1");

    const coverage = risk!.factors.find((f) => f.label === "Test coverage gap")!;
    expect(coverage.points).toBe(20);
    expect(coverage.detail).toMatch(/no test cases exist/i);
  });

  it("gives a clean requirement (no bugs, all accepted, all passing) a low score", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "VIEWER" } as never);
    vi.mocked(prisma.requirement.findMany).mockResolvedValue([
      {
        id: "req_1",
        title: "Healthy requirement",
        testCases: [
          {
            reviewStatus: "ACCEPTED",
            bugs: [],
            testRunResults: [{ result: "PASS" }],
          },
        ],
      },
    ] as never);

    const [risk] = await computeProjectRisk("user_1", "proj_1");

    expect(risk!.score).toBe(0);
    expect(risk!.level).toBe("LOW");
  });

  it("weighs open bug severity, ignoring resolved/closed bugs", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "VIEWER" } as never);
    vi.mocked(prisma.requirement.findMany).mockResolvedValue([
      {
        id: "req_1",
        title: "Buggy requirement",
        testCases: [
          {
            reviewStatus: "ACCEPTED",
            bugs: [
              { severity: "CRITICAL", status: "OPEN" },
              { severity: "CRITICAL", status: "RESOLVED" },
            ],
            testRunResults: [],
          },
        ],
      },
    ] as never);

    const [risk] = await computeProjectRisk("user_1", "proj_1");

    const bugFactor = risk!.factors.find((f) => f.label === "Open bug severity")!;
    expect(bugFactor.points).toBe(16);
    expect(bugFactor.detail).toMatch(/1 open bug/i);
  });

  it("counts a most-recent FAIL/BLOCKED result as a regression risk factor", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "VIEWER" } as never);
    vi.mocked(prisma.requirement.findMany).mockResolvedValue([
      {
        id: "req_1",
        title: "Flaky requirement",
        testCases: [
          { reviewStatus: "ACCEPTED", bugs: [], testRunResults: [{ result: "FAIL" }] },
          { reviewStatus: "ACCEPTED", bugs: [], testRunResults: [{ result: "PASS" }] },
        ],
      },
    ] as never);

    const [risk] = await computeProjectRisk("user_1", "proj_1");

    const regressionFactor = risk!.factors.find((f) => f.label === "Recent regression failures")!;
    expect(regressionFactor.points).toBe(20);
  });

  it("sorts requirements by score descending", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "VIEWER" } as never);
    vi.mocked(prisma.requirement.findMany).mockResolvedValue([
      { id: "req_low", title: "Low risk", testCases: [{ reviewStatus: "ACCEPTED", bugs: [], testRunResults: [] }] },
      { id: "req_high", title: "High risk", testCases: [] },
    ] as never);

    const risks = await computeProjectRisk("user_1", "proj_1");

    expect(risks[0]!.requirementId).toBe("req_high");
    expect(risks[1]!.requirementId).toBe("req_low");
  });
});
