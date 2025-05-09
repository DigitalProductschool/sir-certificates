import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

async function main() {
  // Upgrade user 1 to super admin
  const admin = await prisma.user.update({
    where: {
      id: 1,
    },
    update: {
      isSuperAdmin: true,
    },
  });
  console.log("Admin:", admin);
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
