import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import * as accessControl from "@/server/auth/access-control";
import * as projectRepository from "@/server/repositories/project-repository";
import { prisma } from "@/server/db/prisma";
import { createProject, updateProject, deleteProject } from "@/server/services/project-service";

vi.mock("@/server/auth/access-control");
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
      .mockResolvedValueOnce({ id: "existing" } as never)
      .mockResolvedValueOnce(null);
    const tx = mockTransaction({ id: "proj_2", slug: "checkout-revamp-2" });

    await createProject("user_1", { name: "Checkout Revamp" });

    expect(tx.project.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ slug: "checkout-revamp-2" }) }),
    );
  });
});

describe("updateProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires at least ADMIN access on the project", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockRejectedValue(new ForbiddenError());

    await expect(
      updateProject("user_1", { projectId: "proj_1", name: "New Name" }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("updates the project's name and description", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "ADMIN" } as never);

    const tx = {
      project: { update: vi.fn().mockResolvedValue({ id: "proj_1", name: "New Name" }) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.mocked(prisma.$transaction).mockImplementation(
      // @ts-expect-error — simplified transaction signature for testing
      async (fn: (tx: typeof tx) => unknown) => fn(tx),
    );

    await updateProject("user_1", { projectId: "proj_1", name: "New Name", description: "Updated" });

    expect(tx.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "proj_1" },
        data: { name: "New Name", description: "Updated" },
      }),
    );
  });
});

describe("deleteProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires at least OWNER access on the project", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockRejectedValue(new ForbiddenError());

    await expect(deleteProject("user_1", "proj_1", "Demo Project")).rejects.toThrow(
      ForbiddenError,
    );
  });

  it("throws NotFoundError when the project doesn't exist", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "OWNER" } as never);
    vi.mocked(projectRepository.findProjectById).mockResolvedValue(null);

    await expect(deleteProject("user_1", "missing_id", "Anything")).rejects.toThrow(
      NotFoundError,
    );
  });

  it("throws ValidationError when the confirmation name doesn't match exactly", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "OWNER" } as never);
    vi.mocked(projectRepository.findProjectById).mockResolvedValue({
      id: "proj_1",
      name: "Demo Project",
    } as never);

    await expect(deleteProject("user_1", "proj_1", "wrong name")).rejects.toThrow(
      ValidationError,
    );
  });

  it("deletes the project and logs the deletion with projectId: null", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "OWNER" } as never);
    vi.mocked(projectRepository.findProjectById).mockResolvedValue({
      id: "proj_1",
      name: "Demo Project",
    } as never);

    const tx = {
      project: { delete: vi.fn().mockResolvedValue({}) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.mocked(prisma.$transaction).mockImplementation(
      // @ts-expect-error — simplified transaction signature for testing
      async (fn: (tx: typeof tx) => unknown) => fn(tx),
    );

    await deleteProject("user_1", "proj_1", "Demo Project");

    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "project.deleted", projectId: null }),
      }),
    );
    expect(tx.project.delete).toHaveBeenCalledWith({ where: { id: "proj_1" } });
  });
});
