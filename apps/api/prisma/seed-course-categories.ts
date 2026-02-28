import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Brak DATABASE_URL w apps/api/.env');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const categories = [
  { code: 'B', name: 'Kat. B' },
  { code: 'B_AUT', name: 'Kat. B automat' },
  { code: 'B_NO_THEORY', name: 'Kat. B bez teorii' },
  { code: 'B_AUT_NO_THEORY', name: 'Kat. B automat bez teorii' },
  { code: 'B_INDIVIDUAL', name: 'Kat. B kurs indywidualny' },
  { code: 'B_AFTER_B1', name: 'Kat. B po B1' },
];

async function main() {
  for (const c of categories) {
    await prisma.courseCategory.upsert({
      where: { code: c.code },
      update: { name: c.name },
      create: { code: c.code, name: c.name },
    });
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});
