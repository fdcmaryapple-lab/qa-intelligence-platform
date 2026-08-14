import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Development seed data.
 *
 * Kept intentionally minimal in Phase 1 — just enough to verify the schema
 * works end-to-end. Grows alongside each phase (a seeded project with
 * requirements, test cases, etc. once those models exist).
 */
async function main() {
  const owner = await prisma.user.upsert({
    where: { email: "owner@example.com" },
    update: {},
    create: {
      email: "owner@example.com",
      name: "Alex Owner",
    },
  });

  const project = await prisma.project.upsert({
    where: { slug: "demo-project" },
    update: {},
    create: {
      name: "Demo Project",
      slug: "demo-project",
      description: "Seeded project for local development.",
      members: {
        create: {
          userId: owner.id,
          role: "OWNER",
        },
      },
    },
  });

  console.warn(`Seeded user ${owner.email} as OWNER of project "${project.name}"`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
