import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenError, AiGenerationError, NotFoundError } from "@/lib/errors";
import * as accessControl from "@/server/auth/access-control";
import * as automationRepository from "@/server/repositories/automation-repository";
import { prisma } from "@/server/db/prisma";
import { getAnthropicClient } from "@/server/ai/client";
import { executeAutomationScript } from "@/server/automation/execute-script";
import {
  createAutomationScript,
  generateAutomationScriptFromTestCase,
  runAutomationScript,
} from "@/server/services/automation-service";

vi.mock("@/server/auth/access-control");
vi.mock("@/server/ai/client");
vi.mock("@/server/automation/execute-script");
vi.mock("@/server/repositories/automation-repository");
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

describe("runAutomationScript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws NotFoundError when the script doesn't exist", async () => {
    vi.mocked(automationRepository.findAutomationScriptById).mockResolvedValue(null);

    await expect(runAutomationScript("user_1", "missing_id")).rejects.toThrow(NotFoundError);
  });

  it("requires at least ADMIN access on the project — a stricter bar than creating a script", async () => {
    vi.mocked(automationRepository.findAutomationScriptById).mockResolvedValue({
      id: "script_1",
      projectId: "proj_1",
      code: "test('x', async () => {});",
    } as never);
    vi.mocked(accessControl.requireProjectAccess).mockRejectedValue(new ForbiddenError());

    await expect(runAutomationScript("user_1", "script_1")).rejects.toThrow(ForbiddenError);
    expect(accessControl.requireProjectAccess).toHaveBeenCalledWith("user_1", "proj_1", "ADMIN");
  });

  it("never spawns a real process — executeAutomationScript is fully mocked, and persists whatever it returns", async () => {
    vi.mocked(automationRepository.findAutomationScriptById).mockResolvedValue({
      id: "script_1",
      projectId: "proj_1",
      code: "test('x', async () => {});",
    } as never);
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "ADMIN" } as never);
    vi.mocked(executeAutomationScript).mockResolvedValue({
      status: "PASS",
      exitCode: 0,
      stdout: "1 passed",
      stderr: "",
      durationMs: 4200,
    });

    const tx = {
      automationRun: {
        create: vi.fn().mockImplementation(({ data }) => ({ id: "run_1", ...data })),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.mocked(prisma.$transaction).mockImplementation(
      // @ts-expect-error — simplified transaction signature for testing
      async (fn: (tx: typeof tx) => unknown) => fn(tx),
    );

    const run = await runAutomationScript("user_1", "script_1");

    expect(executeAutomationScript).toHaveBeenCalledWith("test('x', async () => {});");
    expect(tx.automationRun.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PASS", exitCode: 0, durationMs: 4200 }),
      }),
    );
    expect((run as { status: string }).status).toBe("PASS");
  });

  it("persists a FAIL/ERROR result from execution without throwing", async () => {
    vi.mocked(automationRepository.findAutomationScriptById).mockResolvedValue({
      id: "script_1",
      projectId: "proj_1",
      code: "test('x', async () => { throw new Error('boom'); });",
    } as never);
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "ADMIN" } as never);
    vi.mocked(executeAutomationScript).mockResolvedValue({
      status: "FAIL",
      exitCode: 1,
      stdout: "",
      stderr: "1 failed",
      durationMs: 900,
    });

    const tx = {
      automationRun: {
        create: vi.fn().mockImplementation(({ data }) => ({ id: "run_1", ...data })),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.mocked(prisma.$transaction).mockImplementation(
      // @ts-expect-error — simplified transaction signature for testing
      async (fn: (tx: typeof tx) => unknown) => fn(tx),
    );

    const run = await runAutomationScript("user_1", "script_1");

    expect((run as { status: string }).status).toBe("FAIL");
  });
});
