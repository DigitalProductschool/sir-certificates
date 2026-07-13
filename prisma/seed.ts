import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";
import bcrypt from "bcryptjs";
import {
  EMAIL_DEFAULTS,
  EMAIL_TEMPLATES,
  type EmailKey,
} from "../app/lib/email-defaults";

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Sample data for Certiffy
  const org = await prisma.organisation.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "Your Certiffy Organisation",
      imprintUrl: "https://www.certiffy.eu/imprint",
      privacyUrl: "https://www.certiffy.eu/privacy",
      senderEmail: "notifications@certiffy.eu",
      senderName: "Certiffy",
    },
  });
  console.log("Organisation:", org);

  // Sample user
  const passwordHash = await bcrypt.hash(
    process.env.SEED_ADMIN_PASSWORD || "defaultPW",
    10,
  );
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
      email: process.env.SEED_ADMIN_EMAIL || "admin@example.com",
      password: passwordHash,
      firstName: process.env.SEED_ADMIN_FIRSTNAME || "Alpha",
      lastName: process.env.SEED_ADMIN_LASTNAME || "Omega",
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

  // Seed org-level email template defaults (idempotent)
  for (const key of Object.keys(EMAIL_TEMPLATES) as EmailKey[]) {
    const defaults = EMAIL_DEFAULTS[key];
    const existing = await prisma.emailTemplate.findFirst({
      where: { key, programId: null },
    });
    if (existing) {
      await prisma.emailTemplate.update({
        where: { id: existing.id },
        data: defaults,
      });
    } else {
      await prisma.emailTemplate.create({
        data: { key, programId: null, ...defaults },
      });
    }
    console.log(`EmailTemplate seeded: ${key}`);
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
