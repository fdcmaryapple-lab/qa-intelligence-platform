import * as memberRepository from "@/server/repositories/project-member-repository";
import { requireProjectAccess } from "@/server/auth/access-control";
import { prisma } from "@/server/db/prisma";
import { NotFoundError, ValidationError, ConflictError } from "@/lib/errors";
import type { ProjectRole } from "@prisma/client";
import type {
  AddMemberInput,
  UpdateMemberRoleInput,
} from "@/features/members/schemas/member-schemas";

export async function listMembers(userId: string, projectId: string) {
  await requireProjectAccess(userId, projectId, "VIEWER");
  return memberRepository.findMembersForProject(projectId);
}

async function assertCanAssignRole(userId: string, projectId: string, role: ProjectRole) {
  if (role === "OWNER") {
    await requireProjectAccess(userId, projectId, "OWNER");
  }
}

export async function addMember(userId: string, projectId: string, input: AddMemberInput) {
  await requireProjectAccess(userId, projectId, "ADMIN");
  await assertCanAssignRole(userId, projectId, input.role);

  const targetUser = await prisma.user.findUnique({ where: { email: input.email } });
  if (!targetUser) {
    throw new NotFoundError("User", input.email);
  }

  const existing = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId: targetUser.id, projectId } },
  });
  if (existing) {
    throw new ConflictError("This user is already a member of the project.");
  }

  return prisma.$transaction(async (tx) => {
    const member = await tx.projectMember.create({
      data: { userId: targetUser.id, projectId, role: input.role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "project_member.added",
        targetType: "ProjectMember",
        targetId: member.id,
        projectId,
        metadata: { email: targetUser.email, role: input.role },
      },
    });

    return member;
  });
}

export async function updateMemberRole(
  userId: string,
  projectId: string,
  input: UpdateMemberRoleInput,
) {
  await requireProjectAccess(userId, projectId, "ADMIN");
  await assertCanAssignRole(userId, projectId, input.role);

  const member = await memberRepository.findMemberById(input.memberId);
  if (!member || member.projectId !== projectId) {
    throw new NotFoundError("ProjectMember", input.memberId);
  }

  if (member.role === "OWNER" && input.role !== "OWNER") {
    const ownerCount = await memberRepository.countOwners(projectId);
    if (ownerCount <= 1) {
      throw new ValidationError(
        "A project must have at least one OWNER — promote someone else first.",
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.projectMember.update({
      where: { id: input.memberId },
      data: { role: input.role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "project_member.role_changed",
        targetType: "ProjectMember",
        targetId: member.id,
        projectId,
        metadata: { from: member.role, to: input.role, email: member.user.email },
      },
    });

    return updated;
  });
}

export async function removeMember(userId: string, projectId: string, memberId: string) {
  await requireProjectAccess(userId, projectId, "ADMIN");

  const member = await memberRepository.findMemberById(memberId);
  if (!member || member.projectId !== projectId) {
    throw new NotFoundError("ProjectMember", memberId);
  }

  if (member.role === "OWNER") {
    const ownerCount = await memberRepository.countOwners(projectId);
    if (ownerCount <= 1) {
      throw new ValidationError("Can't remove the last OWNER of a project.");
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.projectMember.delete({ where: { id: memberId } });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "project_member.removed",
        targetType: "ProjectMember",
        targetId: memberId,
        projectId,
        metadata: { email: member.user.email, role: member.role },
      },
    });
  });
}
