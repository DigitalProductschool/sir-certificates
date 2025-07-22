import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

async function main() {
  // Sample data for Certiffy
  const org = await prisma.organisation.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Your Certiffy Organisation",
      imprintUrl: "https://www.certiffy.eu/imprint",
      privacyUrl: "https://www.certiffy.eu/privacy",
    },
  });
  console.log("Organisation:", org);

  // Sample user
  const passwordHash = bcrypt.hash(process.env.SEED_ADMIN_PASSWORD, 10);
  const admin = await prisma.user.upsert({
    where: {
      id: 1,
    },
    update: {
      email: process.env.SEED_ADMIN_EMAIL,
      password: passwordHash,
      firstName: process.env.SEED_ADMIN_FIRSTNAME,
      lastName: process.env.SEED_ADMIN_LASTNAME,
      isAdmin: true,
      isSuperAdmin: true,
      isVerified: true,
    },
    create: {
      email: process.env.SEED_ADMIN_EMAIL,
      password: passwordHash,
      firstName: process.env.SEED_ADMIN_FIRSTNAME,
      lastName: process.env.SEED_ADMIN_LASTNAME,
      verifyCode: randomUUID(),
      isAdmin: true,
      isSuperAdmin: true,
      isVerified: true,
    },
  });
  console.log("Admin:", admin);

  // Sample programs
  const program1 = await prisma.program.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Your Certiffy Program",
      about:
        "Add a short and sweet description about your program. You can use Markdown syntax for adding **emphasis**.",
      achievement:
        "Describe the achievement you are certifying in 1-2 sentences.",
      website: "https://certiffy.eu",
    },
  });

  console.log("Programs:", program1);

  // Sample batch
  const batch = await prisma.batch.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Batch 1",
      startDate: new Date(),
      endDate: new Date(),
      program: {
        connect: { id: 1 },
      },
    },
  });
  console.log("Batch", batch);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
