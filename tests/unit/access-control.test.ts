import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/server/db/prisma";
import { requireProjectAccess } from "@/server/auth/access-control";

vi.mock("@/server/db/prisma", () => ({
  prisma: {
    projectMember: { findUnique: vi.fn() },
    project: { findUnique: vi.fn() },
  },
}));

describe("requireProjectAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves when the user's role meets the minimum required role", async () => {
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue({ role: "ADMIN" } as never);

    await expect(requireProjectAccess("user_1", "proj_1", "EDITOR")).resolves.toEqual({
      role: "ADMIN",
    });
  });

  it("throws ForbiddenError when the user's role is below the minimum", async () => {
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue({ role: "VIEWER" } as never);

    await expect(requireProjectAccess("user_1", "proj_1", "EDITOR")).rejects.toThrow(
      ForbiddenError,
    );
  });

  it("throws NotFoundError when the project doesn't exist", async () => {
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.project.findUnique).mockResolvedValue(null);

    await expect(requireProjectAccess("user_1", "nonexistent", "VIEWER")).rejects.toThrow(
      NotFoundError,
    );
  });

  it("throws ForbiddenError when the project exists but the user isn't a member", async () => {
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.project.findUnique).mockResolvedValue({ id: "proj_1" } as never);

    await expect(requireProjectAccess("user_1", "proj_1", "VIEWER")).rejects.toThrow(
      ForbiddenError,
    );
  });
});
