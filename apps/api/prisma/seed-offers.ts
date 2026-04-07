import type { PrismaClient } from '@prisma/client';

const VALID_FROM = new Date('2000-01-01T00:00:00.000Z');
const VALID_TO = new Date('2099-12-31T23:59:59.999Z');

type Price = { customerType: 'PUBLIC' | 'KOPAMA_STUDENT'; priceZloty: string };

async function upsertOffer(
  prisma: PrismaClient,
  params: {
    code: string;
    name: string;
    language: 'PL' | 'EN';
    type: 'COURSE' | 'EXTRA_HOUR' | 'EXAM_CAR' | 'TRAINING_PACKAGE' | 'OTHER';
    unit: 'PACKAGE' | 'HOUR' | 'SERVICE';
    courseCategoryCode?: string;
    prices: Price[];
  },
) {
  const courseCategory = params.courseCategoryCode
    ? await prisma.courseCategory.findUnique({
        where: { code: params.courseCategoryCode },
      })
    : null;

  const offer = await prisma.offerItem.upsert({
    where: { code: params.code },
    update: {
      name: params.name,
      language: params.language,
      type: params.type,
      unit: params.unit,
      isActive: true,
      courseCategoryId: courseCategory?.id ?? null,
    },
    create: {
      code: params.code,
      name: params.name,
      language: params.language,
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

export async function seedOffers(prisma: PrismaClient) {
  await upsertOffer(prisma, {
    code: 'COURSE_B',
    name: 'Kategoria B',
    language: 'PL',
    type: 'COURSE',
    unit: 'PACKAGE',
    courseCategoryCode: 'B',
    prices: [{ customerType: 'PUBLIC', priceZloty: '4100.00' }],
  });

  await upsertOffer(prisma, {
    code: 'COURSE_B_AUT',
    name: 'Kategoria B automat',
    language: 'PL',
    type: 'COURSE',
    unit: 'PACKAGE',
    courseCategoryCode: 'B_AUT',
    prices: [{ customerType: 'PUBLIC', priceZloty: '4300.00' }],
  });

  await upsertOffer(prisma, {
    code: 'COURSE_B_NO_THEORY',
    name: 'Kategoria B bez teorii',
    language: 'PL',
    type: 'COURSE',
    unit: 'PACKAGE',
    courseCategoryCode: 'B_NO_THEORY',
    prices: [{ customerType: 'PUBLIC', priceZloty: '4000.00' }],
  });

  await upsertOffer(prisma, {
    code: 'COURSE_B_AUT_NO_THEORY',
    name: 'Kategoria B automat bez teorii',
    language: 'PL',
    type: 'COURSE',
    unit: 'PACKAGE',
    courseCategoryCode: 'B_AUT_NO_THEORY',
    prices: [{ customerType: 'PUBLIC', priceZloty: '4200.00' }],
  });

  await upsertOffer(prisma, {
    code: 'COURSE_B_INDIVIDUAL',
    name: 'Kategoria B kurs indywidualny',
    language: 'PL',
    type: 'COURSE',
    unit: 'PACKAGE',
    courseCategoryCode: 'B_INDIVIDUAL',
    prices: [{ customerType: 'PUBLIC', priceZloty: '6900.00' }],
  });

  await upsertOffer(prisma, {
    code: 'COURSE_B_AFTER_B1',
    name: 'Kategoria B po B1',
    language: 'PL',
    type: 'COURSE',
    unit: 'PACKAGE',
    courseCategoryCode: 'B_AFTER_B1',
    prices: [{ customerType: 'PUBLIC', priceZloty: '2700.00' }],
  });

  await upsertOffer(prisma, {
    code: 'PACKAGE_14H',
    name: 'Szkolenie uzupełniające 14h',
    language: 'PL',
    type: 'TRAINING_PACKAGE',
    unit: 'PACKAGE',
    courseCategoryCode: 'B',
    prices: [{ customerType: 'PUBLIC', priceZloty: '2100.00' }],
  });

  await upsertOffer(prisma, {
    code: 'HOUR_B',
    name: 'Godzina uzupełniająca kat. B',
    language: 'PL',
    type: 'EXTRA_HOUR',
    unit: 'HOUR',
    courseCategoryCode: 'B',
    prices: [
      { customerType: 'PUBLIC', priceZloty: '165.00' },
      { customerType: 'KOPAMA_STUDENT', priceZloty: '135.00' },
    ],
  });

  await upsertOffer(prisma, {
    code: 'HOUR_B_AUT',
    name: 'Godzina uzupełniająca kat. B automat',
    language: 'PL',
    type: 'EXTRA_HOUR',
    unit: 'HOUR',
    courseCategoryCode: 'B_AUT',
    prices: [
      { customerType: 'PUBLIC', priceZloty: '165.00' },
      { customerType: 'KOPAMA_STUDENT', priceZloty: '135.00' },
    ],
  });

  await upsertOffer(prisma, {
    code: 'EXAM_CAR',
    name: 'Podstawienie pojazdu na egzamin',
    language: 'PL',
    type: 'EXAM_CAR',
    unit: 'SERVICE',
    prices: [
      { customerType: 'PUBLIC', priceZloty: '320.00' },
      { customerType: 'KOPAMA_STUDENT', priceZloty: '260.00' },
    ],
  });

  await upsertOffer(prisma, {
    code: 'COURSE_B_EN',
    name: 'Category B in English',
    language: 'EN',
    type: 'COURSE',
    unit: 'PACKAGE',
    courseCategoryCode: 'B',
    prices: [{ customerType: 'PUBLIC', priceZloty: '5400.00' }],
  });

  await upsertOffer(prisma, {
    code: 'COURSE_B_AUT_EN',
    name: 'Category B (Automatic) in English',
    language: 'EN',
    type: 'COURSE',
    unit: 'PACKAGE',
    courseCategoryCode: 'B_AUT',
    prices: [{ customerType: 'PUBLIC', priceZloty: '5600.00' }],
  });

  await upsertOffer(prisma, {
    code: 'COURSE_B_NO_THEORY_EN',
    name: 'Category B in English AFTER State Theoretical Exam',
    language: 'EN',
    type: 'COURSE',
    unit: 'PACKAGE',
    courseCategoryCode: 'B_NO_THEORY',
    prices: [{ customerType: 'PUBLIC', priceZloty: '5300.00' }],
  });

  await upsertOffer(prisma, {
    code: 'COURSE_B_AUT_NO_THEORY_EN',
    name: 'Category B (Automatic) in English AFTER State Theoretical Exam',
    language: 'EN',
    type: 'COURSE',
    unit: 'PACKAGE',
    courseCategoryCode: 'B_AUT_NO_THEORY',
    prices: [{ customerType: 'PUBLIC', priceZloty: '5500.00' }],
  });
}
