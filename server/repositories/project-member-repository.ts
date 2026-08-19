import { prisma } from "@/server/db/prisma";

export function findMembersForProject(projectId: string) {
  return prisma.projectMember.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}

export function findMemberById(memberId: string) {
  return prisma.projectMember.findUnique({
    where: { id: memberId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}

export function countOwners(projectId: string) {
  return prisma.projectMember.count({ where: { projectId, role: "OWNER" } });
}
