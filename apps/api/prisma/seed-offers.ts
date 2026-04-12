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
    gearboxType?: 'MANUAL' | 'AUTOMATIC';
    fullPriceZloty?: string;
    fullPriceElearningZloty?: string;
    firstInstallmentPriceZloty?: string;
    firstInstallmentPriceElearningZloty?: string;
    installmentsTotalPriceZloty?: string;
    installmentsTotalPriceElearningZloty?: string;
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
      gearboxType: params.gearboxType ?? null,
      fullPriceZloty: params.fullPriceZloty ?? null,
      fullPriceElearningZloty: params.fullPriceElearningZloty ?? null,
      firstInstallmentPriceZloty: params.firstInstallmentPriceZloty ?? null,
      firstInstallmentPriceElearningZloty:
        params.firstInstallmentPriceElearningZloty ?? null,
      installmentsTotalPriceZloty: params.installmentsTotalPriceZloty ?? null,
      installmentsTotalPriceElearningZloty:
        params.installmentsTotalPriceElearningZloty ?? null,
    },
    create: {
      code: params.code,
      name: params.name,
      language: params.language,
      type: params.type,
      unit: params.unit,
      isActive: true,
      courseCategoryId: courseCategory?.id ?? null,
      gearboxType: params.gearboxType ?? null,
      fullPriceZloty: params.fullPriceZloty ?? null,
      fullPriceElearningZloty: params.fullPriceElearningZloty ?? null,
      firstInstallmentPriceZloty: params.firstInstallmentPriceZloty ?? null,
      firstInstallmentPriceElearningZloty:
        params.firstInstallmentPriceElearningZloty ?? null,
      installmentsTotalPriceZloty: params.installmentsTotalPriceZloty ?? null,
      installmentsTotalPriceElearningZloty:
        params.installmentsTotalPriceElearningZloty ?? null,
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
  await prisma.offerItem.updateMany({
    where: {
      code: {
        in: ['COURSE_B_NO_THEORY_EN', 'COURSE_B_AUT_NO_THEORY_EN'],
      },
    },
    data: { isActive: false },
  });

  await upsertOffer(prisma, {
    code: 'COURSE_B',
    name: 'Kategoria B',
    language: 'PL',
    type: 'COURSE',
    unit: 'PACKAGE',
    courseCategoryCode: 'B',
    gearboxType: 'MANUAL',
    fullPriceZloty: '4600.00',
    fullPriceElearningZloty: '4500.00',
    firstInstallmentPriceZloty: '1600.00',
    firstInstallmentPriceElearningZloty: '1700.00',
    installmentsTotalPriceZloty: '4800.00',
    installmentsTotalPriceElearningZloty: '4700.00',
    prices: [{ customerType: 'PUBLIC', priceZloty: '4600.00' }],
  });

  await upsertOffer(prisma, {
    code: 'COURSE_B_AUT',
    name: 'Kategoria B automat',
    language: 'PL',
    type: 'COURSE',
    unit: 'PACKAGE',
    courseCategoryCode: 'B_AUT',
    gearboxType: 'AUTOMATIC',
    fullPriceZloty: '4800.00',
    fullPriceElearningZloty: '4700.00',
    firstInstallmentPriceZloty: '1700.00',
    firstInstallmentPriceElearningZloty: '1700.00',
    installmentsTotalPriceZloty: '5000.00',
    installmentsTotalPriceElearningZloty: '4900.00',
    prices: [{ customerType: 'PUBLIC', priceZloty: '4800.00' }],
  });

  await upsertOffer(prisma, {
    code: 'COURSE_B_NO_THEORY',
    name: 'Kategoria B bez teorii',
    language: 'PL',
    type: 'COURSE',
    unit: 'PACKAGE',
    courseCategoryCode: 'B_NO_THEORY',
    gearboxType: 'MANUAL',
    fullPriceZloty: '4400.00',
    firstInstallmentPriceZloty: '1600.00',
    installmentsTotalPriceZloty: '4600.00',
    prices: [{ customerType: 'PUBLIC', priceZloty: '4400.00' }],
  });

  await upsertOffer(prisma, {
    code: 'COURSE_B_AUT_NO_THEORY',
    name: 'Kategoria B automat bez teorii',
    language: 'PL',
    type: 'COURSE',
    unit: 'PACKAGE',
    courseCategoryCode: 'B_AUT_NO_THEORY',
    gearboxType: 'AUTOMATIC',
    fullPriceZloty: '4600.00',
    firstInstallmentPriceZloty: '1600.00',
    installmentsTotalPriceZloty: '4800.00',
    prices: [{ customerType: 'PUBLIC', priceZloty: '4600.00' }],
  });

  await upsertOffer(prisma, {
    code: 'COURSE_B_AFTER_B1',
    name: 'Kategoria B po B1',
    language: 'PL',
    type: 'COURSE',
    unit: 'PACKAGE',
    courseCategoryCode: 'B_AFTER_B1',
    gearboxType: 'MANUAL',
    fullPriceZloty: '3000.00',
    firstInstallmentPriceZloty: '1100.00',
    installmentsTotalPriceZloty: '3200.00',
    prices: [{ customerType: 'PUBLIC', priceZloty: '3000.00' }],
  });

  await upsertOffer(prisma, {
    code: 'COURSE_B_AUT_AFTER_B1',
    name: 'Kategoria B automat po B1',
    language: 'PL',
    type: 'COURSE',
    unit: 'PACKAGE',
    courseCategoryCode: 'B_AFTER_B1',
    gearboxType: 'AUTOMATIC',
    fullPriceZloty: '3200.00',
    firstInstallmentPriceZloty: '1100.00',
    installmentsTotalPriceZloty: '3400.00',
    prices: [{ customerType: 'PUBLIC', priceZloty: '3200.00' }],
  });

  await upsertOffer(prisma, {
    code: 'COURSE_B_INDIVIDUAL',
    name: 'Kategoria B kurs indywidualny',
    language: 'PL',
    type: 'COURSE',
    unit: 'PACKAGE',
    courseCategoryCode: 'B_INDIVIDUAL',
    gearboxType: 'MANUAL',
    fullPriceZloty: '7800.00',
    firstInstallmentPriceZloty: '2700.00',
    installmentsTotalPriceZloty: '8000.00',
    prices: [{ customerType: 'PUBLIC', priceZloty: '7800.00' }],
  });

  await upsertOffer(prisma, {
    code: 'COURSE_B_AUT_INDIVIDUAL',
    name: 'Kategoria B automat indywidualny',
    language: 'PL',
    type: 'COURSE',
    unit: 'PACKAGE',
    courseCategoryCode: 'B_INDIVIDUAL',
    gearboxType: 'AUTOMATIC',
    fullPriceZloty: '8000.00',
    firstInstallmentPriceZloty: '2800.00',
    installmentsTotalPriceZloty: '8200.00',
    prices: [{ customerType: 'PUBLIC', priceZloty: '8000.00' }],
  });

  await upsertOffer(prisma, {
    code: 'COURSE_B_EN',
    name: 'Category B in English',
    language: 'EN',
    type: 'COURSE',
    unit: 'PACKAGE',
    courseCategoryCode: 'B',
    gearboxType: 'MANUAL',
    fullPriceZloty: '5400.00',
    firstInstallmentPriceZloty: '2000.00',
    installmentsTotalPriceZloty: '5600.00',
    prices: [{ customerType: 'PUBLIC', priceZloty: '5400.00' }],
  });

  await upsertOffer(prisma, {
    code: 'COURSE_B_AUT_EN',
    name: 'Category B (Automatic) in English',
    language: 'EN',
    type: 'COURSE',
    unit: 'PACKAGE',
    courseCategoryCode: 'B_AUT',
    gearboxType: 'AUTOMATIC',
    fullPriceZloty: '5600.00',
    firstInstallmentPriceZloty: '2000.00',
    installmentsTotalPriceZloty: '5800.00',
    prices: [{ customerType: 'PUBLIC', priceZloty: '5600.00' }],
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
}
