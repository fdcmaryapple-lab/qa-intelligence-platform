import { PrismaClient } from "@prisma/client";
import { isDevelopment } from "@/lib/env";

/**
 * Singleton Prisma client.
 *
 * In development, Next.js hot-reloads server modules on every save, which
 * would otherwise create a new PrismaClient (and a new DB connection pool)
 * per reload and quickly exhaust Postgres connections. Stashing the
 * instance on `globalThis` survives the reload and reuses one client.
 * In production, each server instance simply creates one client at boot.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isDevelopment ? ["warn", "error"] : ["error"],
  });

if (isDevelopment) {
  globalForPrisma.prisma = prisma;
}
