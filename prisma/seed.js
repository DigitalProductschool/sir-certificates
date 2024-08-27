import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organisation.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: "UnternehmerTUM",
    },
  });
  console.log(org);
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
