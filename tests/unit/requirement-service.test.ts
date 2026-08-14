import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenError } from "@/lib/errors";
import * as accessControl from "@/server/auth/access-control";
import { prisma } from "@/server/db/prisma";
import { createRequirement } from "@/server/services/requirement-service";

vi.mock("@/server/auth/access-control");
vi.mock("@/server/db/prisma", () => ({
  prisma: { $transaction: vi.fn() },
}));

describe("createRequirement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires at least EDITOR access on the project", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockRejectedValue(new ForbiddenError());

    await expect(
      createRequirement("user_1", {
        projectId: "proj_1",
        title: "Users can filter by date",
        priority: "MEDIUM",
      }),
    ).rejects.toThrow(ForbiddenError);

    expect(accessControl.requireProjectAccess).toHaveBeenCalledWith("user_1", "proj_1", "EDITOR");
  });

  it("creates the requirement and an audit log entry when authorized", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "EDITOR" } as never);

    const tx = {
      requirement: {
        create: vi.fn().mockResolvedValue({ id: "req_1", title: "Users can filter by date" }),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.mocked(prisma.$transaction).mockImplementation(
      // @ts-expect-error — simplified transaction signature for testing
      async (fn: (tx: typeof tx) => unknown) => fn(tx),
    );

    const result = await createRequirement("user_1", {
      projectId: "proj_1",
      title: "Users can filter by date",
      priority: "HIGH",
    });

    expect(tx.requirement.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: "proj_1",
          title: "Users can filter by date",
          priority: "HIGH",
          createdById: "user_1",
        }),
      }),
    );
    expect(tx.auditLog.create).toHaveBeenCalled();
    expect(result.title).toBe("Users can filter by date");
  });
});
