import { requireProjectAccess } from "@/server/auth/access-control";
import { prisma } from "@/server/db/prisma";

const RECENT_LOGS_LIMIT = 100;

export async function listAuditLogs(userId: string, projectId: string) {
  await requireProjectAccess(userId, projectId, "ADMIN");

  return prisma.auditLog.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take: RECENT_LOGS_LIMIT,
    include: { actor: { select: { id: true, name: true, email: true } } },
  });
}
