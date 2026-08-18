import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenError, AiGenerationError } from "@/lib/errors";
import * as accessControl from "@/server/auth/access-control";
import { prisma } from "@/server/db/prisma";
import { getAnthropicClient } from "@/server/ai/client";
import {
  createAutomationScript,
  generateAutomationScriptFromTestCase,
} from "@/server/services/automation-service";

vi.mock("@/server/auth/access-control");
vi.mock("@/server/ai/client");
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    testCase: { findUnique: vi.fn() },
  },
}));

describe("createAutomationScript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires at least EDITOR access on the project", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockRejectedValue(new ForbiddenError());

    await expect(
      createAutomationScript("user_1", {
        projectId: "proj_1",
        title: "My script",
        code: "test('x', async () => {});",
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("creates manually authored scripts as ACCEPTED, not DRAFT, and marks valid syntax as valid", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "EDITOR" } as never);

    const tx = {
      automationScript: {
        create: vi.fn().mockImplementation(({ data }) => ({ id: "script_1", ...data })),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.mocked(prisma.$transaction).mockImplementation(
      // @ts-expect-error — simplified transaction signature for testing
      async (fn: (tx: typeof tx) => unknown) => fn(tx),
    );

    const result = await createAutomationScript("user_1", {
      projectId: "proj_1",
      title: "My script",
      code: "import { test } from '@playwright/test';\ntest('x', async () => {});",
    });

    expect(tx.automationScript.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reviewStatus: "ACCEPTED", isValid: true }),
      }),
    );
    expect((result as { isValid: boolean }).isValid).toBe(true);
  });

  it("marks a syntactically broken script as invalid, but still saves it", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "EDITOR" } as never);

    const tx = {
      automationScript: {
        create: vi.fn().mockImplementation(({ data }) => ({ id: "script_1", ...data })),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.mocked(prisma.$transaction).mockImplementation(
      // @ts-expect-error — simplified transaction signature for testing
      async (fn: (tx: typeof tx) => unknown) => fn(tx),
    );

    const result = await createAutomationScript("user_1", {
      projectId: "proj_1",
      title: "Broken script",
      code: "test('broken', async () => { (",
    });

    expect(tx.automationScript.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isValid: false }),
      }),
    );
    expect((result as { isValid: boolean; validationErrors: string | null }).validationErrors).not.toBeNull();
  });
});

describe("generateAutomationScriptFromTestCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws AiGenerationError when the Claude API request itself fails", async () => {
    vi.mocked(prisma.testCase.findUnique).mockResolvedValue({
      id: "tc_1",
      projectId: "proj_1",
      title: "Login with valid credentials",
      preconditions: null,
      steps: ["Open login page", "Enter valid credentials", "Submit"],
      expectedResult: "User is logged in",
    } as never);
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "EDITOR" } as never);
    vi.mocked(getAnthropicClient).mockReturnValue({
      messages: { create: vi.fn().mockRejectedValue(new Error("network error")) },
    } as never);

    await expect(generateAutomationScriptFromTestCase("user_1", "tc_1")).rejects.toThrow(
      AiGenerationError,
    );
  });

  it("creates a DRAFT script linked to a new AiGeneration row on success", async () => {
    vi.mocked(prisma.testCase.findUnique).mockResolvedValue({
      id: "tc_1",
      projectId: "proj_1",
      title: "Login with valid credentials",
      preconditions: null,
      steps: ["Open login page", "Enter valid credentials", "Submit"],
      expectedResult: "User is logged in",
    } as never);
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "EDITOR" } as never);

    const fakeResponse = {
      content: [
        {
          type: "tool_use",
          name: "submit_automation_script",
          input: {
            code: "import { test, expect } from '@playwright/test';\n\ntest('login', async ({ page }) => {\n  // TODO: replace with real URL\n  await page.goto('https://example.com/login');\n  await expect(page).toHaveURL(/dashboard/);\n});",
          },
        },
      ],
      stop_reason: "tool_use",
      usage: { input_tokens: 90, output_tokens: 120 },
    };
    vi.mocked(getAnthropicClient).mockReturnValue({
      messages: { create: vi.fn().mockResolvedValue(fakeResponse) },
    } as never);

    const tx = {
      aiGeneration: { create: vi.fn().mockResolvedValue({ id: "aigen_1" }) },
      automationScript: {
        create: vi.fn().mockImplementation(({ data }) => ({ id: "script_1", ...data })),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.mocked(prisma.$transaction).mockImplementation(
      // @ts-expect-error — simplified transaction signature for testing
      async (fn: (tx: typeof tx) => unknown) => fn(tx),
    );

    const result = await generateAutomationScriptFromTestCase("user_1", "tc_1");

    expect(tx.aiGeneration.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ targetType: "AutomationScript", status: "SUCCESS" }),
      }),
    );
    expect(tx.automationScript.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reviewStatus: "DRAFT",
          aiGenerationId: "aigen_1",
          testCaseId: "tc_1",
          isValid: true,
        }),
      }),
    );
    expect((result as { reviewStatus: string }).reviewStatus).toBe("DRAFT");
  });
});
