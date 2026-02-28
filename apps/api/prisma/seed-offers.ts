import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const VALID_FROM = new Date('2000-01-01T00:00:00.000Z');
const VALID_TO = new Date('2099-12-31T23:59:59.999Z');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('Brak DATABASE_URL w apps/api/.env');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

type Price = { customerType: 'PUBLIC' | 'KOPAMA_STUDENT'; priceZloty: string };

async function upsertOffer(params: {
  code: string;
  name: string;
  type: 'COURSE' | 'EXTRA_HOUR' | 'EXAM_CAR' | 'TRAINING_PACKAGE' | 'OTHER';
  unit: 'PACKAGE' | 'HOUR' | 'SERVICE';
  courseCategoryCode?: string;
  prices: Price[];
}) {
  const courseCategory = params.courseCategoryCode
    ? await prisma.courseCategory.findUnique({
        where: { code: params.courseCategoryCode },
      })
    : null;

  const offer = await prisma.offerItem.upsert({
    where: { code: params.code },
    update: {
      name: params.name,
      type: params.type,
      unit: params.unit,
      isActive: true,
      courseCategoryId: courseCategory?.id ?? null,
    },
    create: {
      code: params.code,
      name: params.name,
      type: params.type,
      unit: params.unit,
      isActive: true,
      courseCategoryId: courseCategory?.id ?? null,
    },
  });

  for (const p of params.prices) {
    await prisma.priceRule.upsert({
      where: {
        offerItemId_customerType_validFrom_validTo: {
          offerItemId: offer.id,
          customerType: p.customerType,
          validFrom: VALID_FROM,
          validTo: VALID_TO,
        },
      },
      update: {
        priceZloty: p.priceZloty,
        currency: 'PLN',
        validFrom: VALID_FROM,
        validTo: VALID_TO,
      },
      create: {
        offerItemId: offer.id,
        customerType: p.customerType,
        priceZloty: p.priceZloty,
        currency: 'PLN',
        validFrom: VALID_FROM,
        validTo: VALID_TO,
      },
    });
  }
}

async function main() {
  // Kursy (PUBLIC)
  await upsertOffer({
    code: 'COURSE_B',
    name: 'Kategoria B',
    type: 'COURSE',
    unit: 'PACKAGE',
    courseCategoryCode: 'B',
    prices: [{ customerType: 'PUBLIC', priceZloty: '4100.00' }],
  });

  await upsertOffer({
    code: 'COURSE_B_AUT',
    name: 'Kategoria B automat',
    type: 'COURSE',
    unit: 'PACKAGE',
    courseCategoryCode: 'B_AUT',
    prices: [{ customerType: 'PUBLIC', priceZloty: '4300.00' }],
  });

  await upsertOffer({
    code: 'COURSE_B_NO_THEORY',
    name: 'Kategoria B bez teorii',
    type: 'COURSE',
    unit: 'PACKAGE',
    courseCategoryCode: 'B_NO_THEORY',
    prices: [{ customerType: 'PUBLIC', priceZloty: '4000.00' }],
  });

  await upsertOffer({
    code: 'COURSE_B_AUT_NO_THEORY',
    name: 'Kategoria B automat bez teorii',
    type: 'COURSE',
    unit: 'PACKAGE',
    courseCategoryCode: 'B_AUT_NO_THEORY',
    prices: [{ customerType: 'PUBLIC', priceZloty: '4200.00' }],
  });

  await upsertOffer({
    code: 'COURSE_B_INDIVIDUAL',
    name: 'Kategoria B kurs indywidualny',
    type: 'COURSE',
    unit: 'PACKAGE',
    courseCategoryCode: 'B_INDIVIDUAL',
    prices: [{ customerType: 'PUBLIC', priceZloty: '6900.00' }],
  });

  await upsertOffer({
    code: 'COURSE_B_AFTER_B1',
    name: 'Kategoria B po B1',
    type: 'COURSE',
    unit: 'PACKAGE',
    courseCategoryCode: 'B_AFTER_B1',
    prices: [{ customerType: 'PUBLIC', priceZloty: '2700.00' }],
  });

  // Pakiet 14h
  await upsertOffer({
    code: 'PACKAGE_14H',
    name: 'Szkolenie uzupełniające 14h',
    type: 'TRAINING_PACKAGE',
    unit: 'PACKAGE',
    courseCategoryCode: 'B',
    prices: [{ customerType: 'PUBLIC', priceZloty: '2100.00' }],
  });

  // Godziny
  await upsertOffer({
    code: 'HOUR_B',
    name: 'Godzina uzupełniająca kat. B',
    type: 'EXTRA_HOUR',
    unit: 'HOUR',
    courseCategoryCode: 'B',
    prices: [
      { customerType: 'PUBLIC', priceZloty: '165.00' },
      { customerType: 'KOPAMA_STUDENT', priceZloty: '135.00' },
    ],
  });

  await upsertOffer({
    code: 'HOUR_B_AUT',
    name: 'Godzina uzupełniająca kat. B automat',
    type: 'EXTRA_HOUR',
    unit: 'HOUR',
    courseCategoryCode: 'B_AUT',
    prices: [
      { customerType: 'PUBLIC', priceZloty: '165.00' },
      { customerType: 'KOPAMA_STUDENT', priceZloty: '135.00' },
    ],
  });

  // Podstawienie auta na egzamin
  await upsertOffer({
    code: 'EXAM_CAR',
    name: 'Podstawienie pojazdu na egzamin',
    type: 'EXAM_CAR',
    unit: 'SERVICE',
    prices: [
      { customerType: 'PUBLIC', priceZloty: '320.00' },
      { customerType: 'KOPAMA_STUDENT', priceZloty: '260.00' },
    ],
  });
}

main().finally(async () => {
  await prisma.$disconnect();
});
