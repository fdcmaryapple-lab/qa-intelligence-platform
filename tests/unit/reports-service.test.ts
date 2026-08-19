import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenError } from "@/lib/errors";
import * as accessControl from "@/server/auth/access-control";
import { prisma } from "@/server/db/prisma";
import { getProjectReport } from "@/server/services/reports-service";

vi.mock("@/server/auth/access-control");
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    testCase: { groupBy: vi.fn() },
    bug: { groupBy: vi.fn() },
    testRunResult: { groupBy: vi.fn() },
    apiRequestExecution: { groupBy: vi.fn() },
    automationScript: { findMany: vi.fn() },
  },
}));

describe("getProjectReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.testCase.groupBy).mockResolvedValue([]);
    vi.mocked(prisma.bug.groupBy).mockResolvedValue([]);
    vi.mocked(prisma.testRunResult.groupBy).mockResolvedValue([]);
    vi.mocked(prisma.apiRequestExecution.groupBy).mockResolvedValue([]);
    vi.mocked(prisma.automationScript.findMany).mockResolvedValue([]);
  });

  it("requires at least VIEWER access on the project", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockRejectedValue(new ForbiddenError());

    await expect(getProjectReport("user_1", "proj_1")).rejects.toThrow(ForbiddenError);
  });

  it("maps groupBy _count._all into flat name/count rows", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "VIEWER" } as never);
    vi.mocked(prisma.bug.groupBy).mockImplementation((args: unknown) => {
      const groupByArgs = args as { by: string[] };
      if (groupByArgs.by[0] === "status") {
        return Promise.resolve([
          { status: "OPEN", _count: { _all: 3 } },
          { status: "CLOSED", _count: { _all: 5 } },
        ]) as never;
      }
      return Promise.resolve([]) as never;
    });

    const report = await getProjectReport("user_1", "proj_1");

    expect(report.bugsByStatus).toEqual([
      { name: "OPEN", count: 3 },
      { name: "CLOSED", count: 5 },
    ]);
  });

  it("buckets automation scripts by isValid into Valid/Invalid/Not checked, omitting zero-count buckets", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "VIEWER" } as never);
    vi.mocked(prisma.automationScript.findMany).mockResolvedValue([
      { isValid: true },
      { isValid: true },
      { isValid: false },
      { isValid: null },
    ] as never);

    const report = await getProjectReport("user_1", "proj_1");

    expect(report.automationValidity).toEqual([
      { name: "Valid", count: 2 },
      { name: "Invalid", count: 1 },
      { name: "Not checked", count: 1 },
    ]);
  });

  it("omits an automation validity bucket entirely when its count is zero", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "VIEWER" } as never);
    vi.mocked(prisma.automationScript.findMany).mockResolvedValue([{ isValid: true }] as never);

    const report = await getProjectReport("user_1", "proj_1");

    expect(report.automationValidity).toEqual([{ name: "Valid", count: 1 }]);
  });

  it("returns empty breakdown arrays when a project has no data", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "VIEWER" } as never);

    const report = await getProjectReport("user_1", "proj_1");

    expect(report.testCasesByReviewStatus).toEqual([]);
    expect(report.regressionResults).toEqual([]);
    expect(report.apiExecutionResults).toEqual([]);
    expect(report.automationValidity).toEqual([]);
  });
});
