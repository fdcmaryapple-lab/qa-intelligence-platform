import { describe, it, expect, vi, beforeEach } from "vitest";
import * as projectRepository from "@/server/repositories/project-repository";
import { prisma } from "@/server/db/prisma";
import { createProject } from "@/server/services/project-service";

vi.mock("@/server/repositories/project-repository");
vi.mock("@/server/db/prisma", () => ({
  prisma: { $transaction: vi.fn() },
}));

type FakeTx = {
  project: { create: ReturnType<typeof vi.fn> };
  auditLog: { create: ReturnType<typeof vi.fn> };
};

function mockTransaction(created: { id: string; name?: string; slug: string }): FakeTx {
  const tx: FakeTx = {
    project: { create: vi.fn().mockResolvedValue(created) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };
  vi.mocked(prisma.$transaction).mockImplementation(
    // @ts-expect-error — simplified transaction signature for testing
    async (fn: (tx: FakeTx) => unknown) => fn(tx),
  );
  return tx;
}

describe("createProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("slugifies the project name and makes the creator OWNER", async () => {
    vi.mocked(projectRepository.findProjectBySlug).mockResolvedValue(null);
    const tx = mockTransaction({ id: "proj_1", name: "Checkout Revamp", slug: "checkout-revamp" });

    const result = await createProject("user_1", { name: "Checkout Revamp" });

    expect(tx.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Checkout Revamp",
          slug: "checkout-revamp",
          members: { create: { userId: "user_1", role: "OWNER" } },
        }),
      }),
    );
    expect(tx.auditLog.create).toHaveBeenCalled();
    expect(result.slug).toBe("checkout-revamp");
  });

  it("appends a numeric suffix when the base slug is already taken", async () => {
    vi.mocked(projectRepository.findProjectBySlug)
      .mockResolvedValueOnce({ id: "existing" } as never) // "checkout-revamp" taken
      .mockResolvedValueOnce(null); // "checkout-revamp-2" free
    const tx = mockTransaction({ id: "proj_2", slug: "checkout-revamp-2" });

    await createProject("user_1", { name: "Checkout Revamp" });

    expect(tx.project.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ slug: "checkout-revamp-2" }) }),
    );
  });
});
