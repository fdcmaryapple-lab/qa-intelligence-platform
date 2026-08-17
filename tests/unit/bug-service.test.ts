import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenError, AiGenerationError } from "@/lib/errors";
import * as accessControl from "@/server/auth/access-control";
import { prisma } from "@/server/db/prisma";
import { getAnthropicClient } from "@/server/ai/client";
import { createBug, generateBugReportFromTestCase } from "@/server/services/bug-service";

vi.mock("@/server/auth/access-control");
vi.mock("@/server/ai/client");
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    testCase: { findUnique: vi.fn() },
  },
}));

describe("createBug", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires at least EDITOR access on the project", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockRejectedValue(new ForbiddenError());

    await expect(
      createBug("user_1", {
        projectId: "proj_1",
        title: "Date filter includes out-of-range results",
        stepsToReproduce: ["Open results list", "Set a date range", "Apply filter"],
        severity: "HIGH",
        priority: "HIGH",
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("creates manually authored bugs as ACCEPTED, not DRAFT", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "EDITOR" } as never);

    const tx = {
      bug: { create: vi.fn().mockResolvedValue({ id: "bug_1", reviewStatus: "ACCEPTED" }) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.mocked(prisma.$transaction).mockImplementation(
      // @ts-expect-error — simplified transaction signature for testing
      async (fn: (tx: typeof tx) => unknown) => fn(tx),
    );

    const result = await createBug("user_1", {
      projectId: "proj_1",
      title: "Date filter includes out-of-range results",
      stepsToReproduce: ["Open results list", "Set a date range", "Apply filter"],
      severity: "HIGH",
      priority: "HIGH",
    });

    expect(tx.bug.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ reviewStatus: "ACCEPTED" }) }),
    );
    expect(result.reviewStatus).toBe("ACCEPTED");
  });
});

describe("generateBugReportFromTestCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws AiGenerationError when the Claude API request itself fails", async () => {
    vi.mocked(prisma.testCase.findUnique).mockResolvedValue({
      id: "tc_1",
      projectId: "proj_1",
      title: "Filters results within a valid date range",
      expectedResult: "Only results within the range are shown",
      steps: ["Open the results list", "Set a date range", "Apply the filter"],
    } as never);
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "EDITOR" } as never);
    vi.mocked(getAnthropicClient).mockReturnValue({
      messages: { create: vi.fn().mockRejectedValue(new Error("network error")) },
    } as never);

    await expect(
      generateBugReportFromTestCase(
        "user_1",
        "tc_1",
        "Results outside the selected range still appeared in the list.",
      ),
    ).rejects.toThrow(AiGenerationError);
  });

  it("creates a DRAFT bug linked to a new AiGeneration row on success", async () => {
    vi.mocked(prisma.testCase.findUnique).mockResolvedValue({
      id: "tc_1",
      projectId: "proj_1",
      title: "Filters results within a valid date range",
      expectedResult: "Only results within the range are shown",
      steps: ["Open the results list", "Set a date range", "Apply the filter"],
    } as never);
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "EDITOR" } as never);

    const fakeResponse = {
      content: [
        {
          type: "tool_use",
          name: "submit_bug_report",
          input: {
            title: "Date filter includes results outside the selected range",
            description: "The date range filter does not correctly exclude out-of-range items.",
            stepsToReproduce: ["Open the results list", "Set a date range", "Apply the filter"],
            expectedResult: "Only results within the range are shown",
            actualResult: "Results outside the selected range still appeared in the list.",
            severity: "HIGH",
            priority: "HIGH",
          },
        },
      ],
      stop_reason: "tool_use",
      usage: { input_tokens: 120, output_tokens: 60 },
    };
    vi.mocked(getAnthropicClient).mockReturnValue({
      messages: { create: vi.fn().mockResolvedValue(fakeResponse) },
    } as never);

    const tx = {
      aiGeneration: { create: vi.fn().mockResolvedValue({ id: "aigen_1" }) },
      bug: { create: vi.fn().mockImplementation(({ data }) => ({ id: "bug_1", ...data })) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.mocked(prisma.$transaction).mockImplementation(
      // @ts-expect-error — simplified transaction signature for testing
      async (fn: (tx: typeof tx) => unknown) => fn(tx),
    );

    const result = await generateBugReportFromTestCase(
      "user_1",
      "tc_1",
      "Results outside the selected range still appeared in the list.",
    );

    expect(tx.aiGeneration.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ targetType: "Bug", status: "SUCCESS" }) }),
    );
    expect(tx.bug.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reviewStatus: "DRAFT",
          aiGenerationId: "aigen_1",
          testCaseId: "tc_1",
        }),
      }),
    );
    expect(result.reviewStatus).toBe("DRAFT");
  });
});
