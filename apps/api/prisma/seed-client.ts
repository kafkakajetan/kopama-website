import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Brak DATABASE_URL w apps/api/.env');
}

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
