import { prisma } from "@/server/db/prisma";

export function findAutomationScriptsForProject(projectId: string) {
  return prisma.automationScript.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: {
      testCase: { select: { id: true, title: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      runs: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

export function findAutomationScriptById(automationScriptId: string) {
  return prisma.automationScript.findUnique({ where: { id: automationScriptId } });
}

export function countAutomationScriptsForUser(userId: string) {
  return prisma.automationScript.count({
    where: { project: { members: { some: { userId } } } },
  });
}
