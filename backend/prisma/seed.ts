import "dotenv/config";
import { prisma } from "../src/config/db.ts";
import { seedModules } from "./seeds/modules.seed.ts";
import { seedSuperAdminRole } from "./seeds/roles.seed.ts";
import { seedSuperAdmin } from "./seeds/admin.seed.ts";
import { seedOnboardingTemplates } from "./seeds/onboarding.seed.ts";

async function main() {
  console.log(" Seeding started...\n");

  console.log("DATABASE URL loaded:", !!process.env.DATABASE_URL);

  await prisma.$queryRaw`SELECT 1`;

  console.log("Database query successful");
  await seedModules();        //  Pehle modules

  const documentVerificationModule = await prisma.module.findUnique({
    where: {
      name: "document-verification",
    },
    select: {
      id: true,
    },
  });

  if (documentVerificationModule) {
    await prisma.permission.deleteMany({
      where: {
        moduleId: documentVerificationModule.id,
      },
    });

    await prisma.module.delete({
      where: {
        id: documentVerificationModule.id,
      },
    });

    console.log("Document Verification module deleted!");
  }
  await seedSuperAdminRole(); //  Phir role + permissions
  await seedSuperAdmin();     //  Aakhir mein user
  await seedOnboardingTemplates();

  console.log("\n All seeding done!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });