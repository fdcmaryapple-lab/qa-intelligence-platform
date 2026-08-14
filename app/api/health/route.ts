import { prisma } from "@/server/db/prisma";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

interface HealthPayload {
  status: "ok" | "degraded";
  timestamp: string;
  uptimeSeconds: number;
  database: "connected" | "unreachable";
}

/**
 * GET /api/health
 *
 * Used by container orchestrators, uptime monitors, and local verification
 * to confirm the app is running and can reach the database. Deliberately
 * unauthenticated and lightweight — no business logic, no side effects.
 */
export async function GET() {
  try {
    let database: HealthPayload["database"] = "unreachable";

    try {
      await prisma.$queryRaw`SELECT 1`;
      database = "connected";
    } catch (dbError) {
      logger.error({ err: dbError }, "Health check: database unreachable");
    }

    const payload: HealthPayload = {
      status: database === "connected" ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      database,
    };

    return apiSuccess(payload, {
      status: database === "connected" ? 200 : 503,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
