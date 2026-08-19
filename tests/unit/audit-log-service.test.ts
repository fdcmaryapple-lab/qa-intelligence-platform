import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenError } from "@/lib/errors";
import * as accessControl from "@/server/auth/access-control";
import { prisma } from "@/server/db/prisma";
import { listAuditLogs } from "@/server/services/audit-log-service";

vi.mock("@/server/auth/access-control");
vi.mock("@/server/db/prisma", () => ({
  prisma: { auditLog: { findMany: vi.fn() } },
}));

describe("listAuditLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires at least ADMIN access on the project", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockRejectedValue(new ForbiddenError());

    await expect(listAuditLogs("user_1", "proj_1")).rejects.toThrow(ForbiddenError);
  });

  it("queries logs scoped to the project, most recent first, capped at 100", async () => {
    vi.mocked(accessControl.requireProjectAccess).mockResolvedValue({ role: "ADMIN" } as never);
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([]);

    await listAuditLogs("user_1", "proj_1");

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: "proj_1" },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    );
  });
});
