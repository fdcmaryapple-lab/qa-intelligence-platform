import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenError, AiGenerationError } from "@/lib/errors";
import * as accessControl from "@/server/auth/access-control";
import { prisma } from "@/server/db/prisma";
import { getAnthropicClient } from "@/server/ai/client";
import {
  createTestCase,
  generateTestCasesForRequirement,
} from "@/server/services/test-case-service";

vi.mock("@/server/auth/access-control");
vi.mock("@/server/ai/client");
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    requirement: { findUnique: vi.fn() },
  },
}));

describe("createTestCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires at least EDITOR access on the project", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockRejectedValue(new ForbiddenError());

    await expect(
      createTestCase("user_1", {
        projectId: "proj_1",
        title: "Rejects an expired card",
        steps: ["Go to checkout", "Enter an expired card"],
        expectedResult: "Order is rejected with a clear error",
        type: "NEGATIVE",
        priority: "HIGH",
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("creates manually authored test cases as ACCEPTED, not DRAFT", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "EDITOR" } as never);

    const tx = {
      testCase: {
        create: vi.fn().mockResolvedValue({ id: "tc_1", reviewStatus: "ACCEPTED" }),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.mocked(prisma.$transaction).mockImplementation(
      // @ts-expect-error — simplified transaction signature for testing
      async (fn: (tx: typeof tx) => unknown) => fn(tx),
    );

    const result = await createTestCase("user_1", {
      projectId: "proj_1",
      title: "Rejects an expired card",
      steps: ["Go to checkout", "Enter an expired card"],
      expectedResult: "Order is rejected with a clear error",
      type: "NEGATIVE",
      priority: "HIGH",
    });

    expect(tx.testCase.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reviewStatus: "ACCEPTED" }),
      }),
    );
    expect(result.reviewStatus).toBe("ACCEPTED");
  });
});

describe("generateTestCasesForRequirement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws AiGenerationError when the Claude API request itself fails", async () => {
    vi.mocked(prisma.requirement.findUnique).mockResolvedValue({
      id: "req_1",
      projectId: "proj_1",
      title: "Users can filter by date",
      description: null,
    } as never);
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "EDITOR" } as never);
    vi.mocked(getAnthropicClient).mockReturnValue({
      messages: { create: vi.fn().mockRejectedValue(new Error("network error")) },
    } as never);

    await expect(generateTestCasesForRequirement("user_1", "req_1")).rejects.toThrow(
      AiGenerationError,
    );
  });

  it("creates DRAFT test cases linked to a new AiGeneration row on success", async () => {
    vi.mocked(prisma.requirement.findUnique).mockResolvedValue({
      id: "req_1",
      projectId: "proj_1",
      title: "Users can filter by date",
      description: "Add a date-range filter to the results list.",
    } as never);
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "EDITOR" } as never);

    const fakeResponse = {
      content: [
        {
          type: "tool_use",
          name: "submit_test_cases",
          input: {
            testCases: [
              {
                title: "Filters results within a valid date range",
                description: "Verifies the date filter narrows results correctly.",
                steps: ["Open the results list", "Set a date range", "Apply the filter"],
                expectedResult: "Only results within the range are shown",
                type: "FUNCTIONAL",
                priority: "MEDIUM",
              },
            ],
          },
        },
      ],
      stop_reason: "tool_use",
      usage: { input_tokens: 100, output_tokens: 50 },
    };
    vi.mocked(getAnthropicClient).mockReturnValue({
      messages: { create: vi.fn().mockResolvedValue(fakeResponse) },
    } as never);

    const tx = {
      aiGeneration: { create: vi.fn().mockResolvedValue({ id: "aigen_1" }) },
      testCase: {
        create: vi.fn().mockImplementation(({ data }) => ({ id: "tc_1", ...data })),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.mocked(prisma.$transaction).mockImplementation(
      // @ts-expect-error — simplified transaction signature for testing
      async (fn: (tx: typeof tx) => unknown) => fn(tx),
    );

    const result = await generateTestCasesForRequirement("user_1", "req_1");

    expect(tx.aiGeneration.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ targetType: "TestCase", status: "SUCCESS" }),
      }),
    );
    expect(tx.testCase.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reviewStatus: "DRAFT",
          aiGenerationId: "aigen_1",
          requirementId: "req_1",
        }),
      }),
    );
    expect(result).toHaveLength(1);
  });
});
