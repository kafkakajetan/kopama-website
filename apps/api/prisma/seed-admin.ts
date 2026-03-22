import type { PrismaClient } from '@prisma/client';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

export async function seedAdmin(prisma: PrismaClient) {
  const email = (process.env.ADMIN_EMAIL ?? 'admin@kopama.local')
    .trim()
    .toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? 'Admin12345!';
  const phone = (process.env.ADMIN_PHONE ?? '+48111111111').trim();

  if (!email) {
    throw new Error('Brak ADMIN_EMAIL');
  }

  if (!password || password.length < 8) {
    throw new Error('ADMIN_PASSWORD musi mieć co najmniej 8 znaków.');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {
      role: UserRole.ADMIN,
      phone,
      passwordHash,
    },
    create: {
      email,
      phone,
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  console.log(`Admin gotowy: ${email}`);
}
