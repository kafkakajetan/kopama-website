import { prisma } from './seed-client';
import { seedCourseCategories } from './seed-course-categories';
import { seedOffers } from './seed-offers';
import { seedAdmin } from './seed-admin';

async function main() {
  await seedCourseCategories(prisma);
  await seedOffers(prisma);
  await seedAdmin(prisma);
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
