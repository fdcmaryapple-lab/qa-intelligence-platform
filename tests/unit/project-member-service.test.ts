import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenError, NotFoundError, ValidationError, ConflictError } from "@/lib/errors";
import * as accessControl from "@/server/auth/access-control";
import * as memberRepository from "@/server/repositories/project-member-repository";
import { prisma } from "@/server/db/prisma";
import { addMember, updateMemberRole, removeMember } from "@/server/services/project-member-service";

vi.mock("@/server/auth/access-control");
vi.mock("@/server/repositories/project-member-repository");
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    user: { findUnique: vi.fn() },
    projectMember: { findUnique: vi.fn() },
  },
}));

describe("addMember", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires at least ADMIN access on the project", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockRejectedValue(new ForbiddenError());

    await expect(
      addMember("user_1", "proj_1", { projectId: "proj_1", email: "a@b.com", role: "VIEWER" }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("hardening: assigning OWNER requires the actor to already be an OWNER, not just ADMIN", async () => {
    vi.mocked(accessControl.requireProjectAccess)
      .mockResolvedValueOnce({ role: "ADMIN" } as never)
      .mockRejectedValueOnce(new ForbiddenError("This action requires the OWNER role or higher"));

    await expect(
      addMember("user_1", "proj_1", { projectId: "proj_1", email: "a@b.com", role: "OWNER" }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("throws NotFoundError when no user exists with that email", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "ADMIN" } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(
      addMember("user_1", "proj_1", { projectId: "proj_1", email: "nobody@x.com", role: "VIEWER" }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws ConflictError when the user is already a member", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "ADMIN" } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user_2", email: "a@b.com" } as never);
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue({ id: "existing_member" } as never);

    await expect(
      addMember("user_1", "proj_1", { projectId: "proj_1", email: "a@b.com", role: "VIEWER" }),
    ).rejects.toThrow(ConflictError);
  });

  it("adds the member on success", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "ADMIN" } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user_2", email: "a@b.com" } as never);
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue(null);

    const tx = {
      projectMember: {
        create: vi.fn().mockResolvedValue({ id: "member_1", user: { email: "a@b.com" } }),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.mocked(prisma.$transaction).mockImplementation(
      // @ts-expect-error — simplified transaction signature for testing
      async (fn: (tx: typeof tx) => unknown) => fn(tx),
    );

    await addMember("user_1", "proj_1", { projectId: "proj_1", email: "a@b.com", role: "EDITOR" });

    expect(tx.projectMember.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { userId: "user_2", projectId: "proj_1", role: "EDITOR" } }),
    );
  });
});

describe("updateMemberRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hardening: refuses to demote the last remaining OWNER", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "OWNER" } as never);
    vi.mocked(memberRepository.findMemberById).mockResolvedValue({
      id: "member_1",
      projectId: "proj_1",
      role: "OWNER",
      user: { email: "owner@x.com" },
    } as never);
    vi.mocked(memberRepository.countOwners).mockResolvedValue(1);

    await expect(
      updateMemberRole("user_1", "proj_1", { projectId: "proj_1", memberId: "member_1", role: "ADMIN" }),
    ).rejects.toThrow(ValidationError);
  });

  it("allows demoting an OWNER when another OWNER still exists", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "OWNER" } as never);
    vi.mocked(memberRepository.findMemberById).mockResolvedValue({
      id: "member_1",
      projectId: "proj_1",
      role: "OWNER",
      user: { email: "owner@x.com" },
    } as never);
    vi.mocked(memberRepository.countOwners).mockResolvedValue(2);

    const tx = {
      projectMember: {
        update: vi.fn().mockResolvedValue({ id: "member_1", role: "ADMIN" }),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.mocked(prisma.$transaction).mockImplementation(
      // @ts-expect-error — simplified transaction signature for testing
      async (fn: (tx: typeof tx) => unknown) => fn(tx),
    );

    await updateMemberRole("user_1", "proj_1", {
      projectId: "proj_1",
      memberId: "member_1",
      role: "ADMIN",
    });

    expect(tx.projectMember.update).toHaveBeenCalled();
  });

  it("throws NotFoundError when the member doesn't belong to this project", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "OWNER" } as never);
    vi.mocked(memberRepository.findMemberById).mockResolvedValue({
      id: "member_1",
      projectId: "other_project",
      role: "VIEWER",
      user: { email: "x@x.com" },
    } as never);

    await expect(
      updateMemberRole("user_1", "proj_1", { projectId: "proj_1", memberId: "member_1", role: "EDITOR" }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("removeMember", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hardening: refuses to remove the last remaining OWNER", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "OWNER" } as never);
    vi.mocked(memberRepository.findMemberById).mockResolvedValue({
      id: "member_1",
      projectId: "proj_1",
      role: "OWNER",
      user: { email: "owner@x.com" },
    } as never);
    vi.mocked(memberRepository.countOwners).mockResolvedValue(1);

    await expect(removeMember("user_1", "proj_1", "member_1")).rejects.toThrow(ValidationError);
  });

  it("removes a non-OWNER member without checking owner count", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "ADMIN" } as never);
    vi.mocked(memberRepository.findMemberById).mockResolvedValue({
      id: "member_1",
      projectId: "proj_1",
      role: "VIEWER",
      user: { email: "viewer@x.com" },
    } as never);

    const tx = {
      projectMember: { delete: vi.fn().mockResolvedValue({}) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.mocked(prisma.$transaction).mockImplementation(
      // @ts-expect-error — simplified transaction signature for testing
      async (fn: (tx: typeof tx) => unknown) => fn(tx),
    );

    await removeMember("user_1", "proj_1", "member_1");

    expect(tx.projectMember.delete).toHaveBeenCalledWith({ where: { id: "member_1" } });
    expect(memberRepository.countOwners).not.toHaveBeenCalled();
  });
});
