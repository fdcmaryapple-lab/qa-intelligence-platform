import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import * as accessControl from "@/server/auth/access-control";
import { prisma } from "@/server/db/prisma";
import { createTestRun, recordResult, completeTestRun } from "@/server/services/test-run-service";

vi.mock("@/server/auth/access-control");
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    testRunResult: { findUnique: vi.fn(), update: vi.fn() },
    testRun: { findUnique: vi.fn() },
  },
}));

describe("createTestRun", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires at least EDITOR access on the project", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockRejectedValue(new ForbiddenError());

    await expect(
      createTestRun("user_1", { projectId: "proj_1", name: "Regression 1", testCaseIds: ["tc_1"] }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("creates one result row per selected test case", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "EDITOR" } as never);

    const tx = {
      testRun: { create: vi.fn().mockResolvedValue({ id: "run_1", name: "Regression 1" }) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.mocked(prisma.$transaction).mockImplementation(
      // @ts-expect-error — simplified transaction signature for testing
      async (fn: (tx: typeof tx) => unknown) => fn(tx),
    );

    await createTestRun("user_1", {
      projectId: "proj_1",
      name: "Regression 1",
      testCaseIds: ["tc_1", "tc_2"],
    });

    expect(tx.testRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          results: { create: [{ testCaseId: "tc_1" }, { testCaseId: "tc_2" }] },
        }),
      }),
    );
  });
});

describe("recordResult", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws NotFoundError when the result row doesn't exist", async () => {
    vi.mocked(prisma.testRunResult.findUnique).mockResolvedValue(null);

    await expect(recordResult("user_1", "missing_id", "PASS", undefined)).rejects.toThrow(
      NotFoundError,
    );
  });

  it("updates the result, notes, and executedBy fields", async () => {
    vi.mocked(prisma.testRunResult.findUnique).mockResolvedValue({
      id: "result_1",
      testRun: { projectId: "proj_1" },
    } as never);
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "EDITOR" } as never);
    vi.mocked(prisma.testRunResult.update).mockResolvedValue({ id: "result_1", result: "FAIL" } as never);

    await recordResult("user_1", "result_1", "FAIL", "Broke on step 3");

    expect(prisma.testRunResult.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "result_1" },
        data: expect.objectContaining({ result: "FAIL", notes: "Broke on step 3", executedById: "user_1" }),
      }),
    );
  });
});

describe("completeTestRun", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws NotFoundError when the run doesn't exist", async () => {
    vi.mocked(prisma.testRun.findUnique).mockResolvedValue(null);

    await expect(completeTestRun("user_1", "missing_id")).rejects.toThrow(NotFoundError);
  });

  it("marks the run COMPLETED with a completedAt timestamp", async () => {
    vi.mocked(prisma.testRun.findUnique).mockResolvedValue({
      id: "run_1",
      projectId: "proj_1",
    } as never);
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "EDITOR" } as never);

    const tx = {
      testRun: { update: vi.fn().mockResolvedValue({ id: "run_1", status: "COMPLETED" }) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.mocked(prisma.$transaction).mockImplementation(
      // @ts-expect-error — simplified transaction signature for testing
      async (fn: (tx: typeof tx) => unknown) => fn(tx),
    );

    await completeTestRun("user_1", "run_1");

    expect(tx.testRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "COMPLETED" }),
      }),
    );
  });
});
