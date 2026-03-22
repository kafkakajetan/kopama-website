import type { PrismaClient } from '@prisma/client';

const categories = [
  { code: 'B', name: 'Kat. B' },
  { code: 'B_AUT', name: 'Kat. B automat' },
  { code: 'B_NO_THEORY', name: 'Kat. B bez teorii' },
  { code: 'B_AUT_NO_THEORY', name: 'Kat. B automat bez teorii' },
  { code: 'B_INDIVIDUAL', name: 'Kat. B kurs indywidualny' },
  { code: 'B_AFTER_B1', name: 'Kat. B po B1' },
];

export async function seedCourseCategories(prisma: PrismaClient) {
  for (const c of categories) {
    await prisma.courseCategory.upsert({
      where: { code: c.code },
      update: { name: c.name },
      create: { code: c.code, name: c.name },
    });
  }
}
