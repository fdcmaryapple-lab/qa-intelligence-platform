import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenError, AiGenerationError } from "@/lib/errors";
import * as accessControl from "@/server/auth/access-control";
import { prisma } from "@/server/db/prisma";
import { getAnthropicClient } from "@/server/ai/client";
import { computeProjectRisk } from "@/server/services/risk-service";
import { getProjectReport } from "@/server/services/reports-service";
import { listMessages, sendMessage } from "@/server/services/ai-assistant-service";

vi.mock("@/server/auth/access-control");
vi.mock("@/server/ai/client");
vi.mock("@/server/services/risk-service");
vi.mock("@/server/services/reports-service");
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    project: { findUnique: vi.fn() },
    aiChatThread: { findFirst: vi.fn(), create: vi.fn() },
  },
}));

const EMPTY_REPORT = {
  testCasesByReviewStatus: [],
  bugsByStatus: [],
  bugsBySeverity: [],
  regressionResults: [],
  apiExecutionResults: [],
  automationValidity: [],
};

describe("listMessages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires at least VIEWER access on the project", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockRejectedValue(new ForbiddenError());

    await expect(listMessages("user_1", "proj_1")).rejects.toThrow(ForbiddenError);
  });

  it("returns an empty array without creating a thread when none exists", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "VIEWER" } as never);
    vi.mocked(prisma.aiChatThread.findFirst).mockResolvedValue(null);

    const messages = await listMessages("user_1", "proj_1");

    expect(messages).toEqual([]);
    expect(prisma.aiChatThread.create).not.toHaveBeenCalled();
  });

  it("returns the existing thread's messages", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "VIEWER" } as never);
    vi.mocked(prisma.aiChatThread.findFirst).mockResolvedValue({
      id: "thread_1",
      messages: [{ id: "msg_1", role: "USER", content: "Hi" }],
    } as never);

    const messages = await listMessages("user_1", "proj_1");

    expect(messages).toHaveLength(1);
  });
});

describe("sendMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(computeProjectRisk).mockResolvedValue([]);
    vi.mocked(getProjectReport).mockResolvedValue(EMPTY_REPORT);
    vi.mocked(prisma.project.findUnique).mockResolvedValue({
      id: "proj_1",
      name: "Demo Project",
      description: null,
    } as never);
  });

  it("requires at least VIEWER access on the project", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockRejectedValue(new ForbiddenError());

    await expect(sendMessage("user_1", "proj_1", "hello")).rejects.toThrow(ForbiddenError);
  });

  it("creates a thread on first use when none exists", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "VIEWER" } as never);
    vi.mocked(prisma.aiChatThread.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.aiChatThread.create).mockResolvedValue({
      id: "thread_new",
      messages: [],
    } as never);
    vi.mocked(getAnthropicClient).mockReturnValue({
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: "text", text: "You have no open bugs." }],
        }),
      },
    } as never);
    vi.mocked(prisma.$transaction).mockImplementation(
      // @ts-expect-error — simplified transaction signature for testing
      async (fn: (tx: unknown) => unknown) =>
        fn({ aiChatMessage: { create: vi.fn().mockResolvedValue({}) } }),
    );

    await sendMessage("user_1", "proj_1", "Any open bugs?");

    expect(prisma.aiChatThread.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { projectId: "proj_1", createdById: "user_1" } }),
    );
  });

  it("reuses an existing thread instead of creating a new one", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "VIEWER" } as never);
    vi.mocked(prisma.aiChatThread.findFirst).mockResolvedValue({
      id: "thread_existing",
      messages: [{ role: "USER", content: "earlier question" }],
    } as never);
    vi.mocked(getAnthropicClient).mockReturnValue({
      messages: {
        create: vi.fn().mockResolvedValue({ content: [{ type: "text", text: "Sure." }] }),
      },
    } as never);
    vi.mocked(prisma.$transaction).mockImplementation(
      // @ts-expect-error — simplified transaction signature for testing
      async (fn: (tx: unknown) => unknown) =>
        fn({ aiChatMessage: { create: vi.fn().mockResolvedValue({}) } }),
    );

    await sendMessage("user_1", "proj_1", "follow up");

    expect(prisma.aiChatThread.create).not.toHaveBeenCalled();
  });

  it("throws AiGenerationError when the Claude API request itself fails", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "VIEWER" } as never);
    vi.mocked(prisma.aiChatThread.findFirst).mockResolvedValue({
      id: "thread_1",
      messages: [],
    } as never);
    vi.mocked(getAnthropicClient).mockReturnValue({
      messages: { create: vi.fn().mockRejectedValue(new Error("network error")) },
    } as never);

    await expect(sendMessage("user_1", "proj_1", "hello")).rejects.toThrow(AiGenerationError);
  });

  it("persists both the user message and the assistant reply", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "VIEWER" } as never);
    vi.mocked(prisma.aiChatThread.findFirst).mockResolvedValue({
      id: "thread_1",
      messages: [],
    } as never);
    vi.mocked(getAnthropicClient).mockReturnValue({
      messages: {
        create: vi.fn().mockResolvedValue({ content: [{ type: "text", text: "Here's the answer." }] }),
      },
    } as never);

    const createMock = vi.fn().mockResolvedValue({});
    vi.mocked(prisma.$transaction).mockImplementation(
      // @ts-expect-error — simplified transaction signature for testing
      async (fn: (tx: unknown) => unknown) => fn({ aiChatMessage: { create: createMock } }),
    );

    const reply = await sendMessage("user_1", "proj_1", "What's my risk?");

    expect(reply).toBe("Here's the answer.");
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: "USER", content: "What's my risk?" }) }),
    );
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: "ASSISTANT", content: "Here's the answer." }),
      }),
    );
  });
});
