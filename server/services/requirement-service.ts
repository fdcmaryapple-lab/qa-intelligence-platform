import * as requirementRepository from "@/server/repositories/requirement-repository";
import { requireProjectAccess } from "@/server/auth/access-control";
import { prisma } from "@/server/db/prisma";
import type { CreateRequirementInput } from "@/features/requirements/schemas/requirement-schemas";

/** Requirements for a project — throws if the user isn't at least a VIEWER on it. */
export async function listRequirements(userId: string, projectId: string) {
  await requireProjectAccess(userId, projectId, "VIEWER");
  return requirementRepository.findRequirementsForProject(projectId);
}

export async function countRequirementsForUser(userId: string) {
  return requirementRepository.countRequirementsForUser(userId);
}

/** Creating a requirement needs at least EDITOR — VIEWERs can read but not author content. */
export async function createRequirement(userId: string, input: CreateRequirementInput) {
  await requireProjectAccess(userId, input.projectId, "EDITOR");

  return prisma.$transaction(async (tx) => {
    const requirement = await tx.requirement.create({
      data: {
        projectId: input.projectId,
        title: input.title,
        description: input.description,
        priority: input.priority,
        createdById: userId,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: userId,
        action: "requirement.created",
        targetType: "Requirement",
        targetId: requirement.id,
        projectId: input.projectId,
        metadata: { title: requirement.title },
      },
    });

    return requirement;
  });
}
