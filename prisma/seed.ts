import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "demo-password-123";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const owner = await prisma.user.upsert({
    where: { email: "owner@example.com" },
    update: { passwordHash },
    create: {
      email: "owner@example.com",
      name: "Alex Owner",
      passwordHash,
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
  console.warn(`Demo login — email: ${owner.email}  password: ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
