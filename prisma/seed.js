import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

async function main() {
  // Sample data for UnternehmerTUM
  const org = await prisma.organisation.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "UnternehmerTUM",
    },
  });
  console.log("Organisation:", org);

  // Sample user
  const passwordHash = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD, 10);
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
      isVerified: true,
    },
    create: {
      email: process.env.SEED_ADMIN_EMAIL,
      password: passwordHash,
      firstName: process.env.SEED_ADMIN_FIRSTNAME,
      lastName: process.env.SEED_ADMIN_LASTNAME,
      verifyCode: randomUUID(),
      isAdmin: true,
      isVerified: true,
    },
  });
  console.log("Admin:", admin);

  // Sample programs

  const program1 = await prisma.program.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Digital Product School",
    },
  });

  const program2 = await prisma.program.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: "Manage and More",
    },
  });

  const program3 = await prisma.program.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: "Innovation Sprint",
    },
  });

  const program4 = await prisma.program.upsert({
    where: { id: 4 },
    update: {},
    create: {
      name: "Innovative Entrepreneurs",
    },
  });

  const program5 = await prisma.program.upsert({
    where: { id: 5 },
    update: {},
    create: {
      name: "XPLORE",
    },
  });

  console.log("Programs:", program1, program2, program3, program4, program5);

  // Sample batches

  for (let i = 1; i < 22; i++) {
    const batch = await prisma.batch.upsert({
      where: { id: i },
      update: {},
      create: {
        name: `Batch ${i}`,
        startDate: new Date(),
        endDate: new Date(),
        program: {
          connect: { id: 1 },
        },
      },
    });
    console.log("Batch", i, batch);
  }
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
