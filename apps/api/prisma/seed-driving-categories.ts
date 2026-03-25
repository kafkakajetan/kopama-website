import type { PrismaClient } from '@prisma/client';

const drivingCategories = [
  {
    code: 'AM',
    name: 'Kategoria AM',
    minAge: 14,
    sortOrder: 1,
    description: 'Motorowery i lekkie czterokołowce.',
  },
  {
    code: 'A1',
    name: 'Kategoria A1',
    minAge: 16,
    sortOrder: 2,
    description:
      'Motocykle do 125 cm³ i do 11 kW oraz motocykle trójkołowe do 15 kW.',
  },
  {
    code: 'A2',
    name: 'Kategoria A2',
    minAge: 18,
    sortOrder: 3,
    description:
      'Motocykle o mocy do 35 kW oraz motocykle trójkołowe do 15 kW.',
  },
  {
    code: 'A',
    name: 'Kategoria A',
    minAge: 20,
    sortOrder: 4,
    description: 'Motocykle, w tym ciężkie, oraz motocykle trójkołowe.',
  },
  {
    code: 'B1',
    name: 'Kategoria B1',
    minAge: 16,
    sortOrder: 5,
    description: 'Czterokołowce i małe samochody osobowe.',
  },
  {
    code: 'B',
    name: 'Kategoria B',
    minAge: 18,
    sortOrder: 6,
    description:
      'Samochody osobowe o DMC do 3,5 t oraz pojazdy z przyczepą lekką.',
  },
  {
    code: 'B_PLUS_E',
    name: 'Kategoria B+E',
    minAge: 18,
    sortOrder: 7,
    description: 'Pojazdy z kategorii B z przyczepą o masie wyższej niż lekka.',
  },
];

export async function seedDrivingCategories(prisma: PrismaClient) {
  for (const item of drivingCategories) {
    await prisma.drivingCategory.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        minAge: item.minAge,
        sortOrder: item.sortOrder,
        description: item.description,
      },
      create: item,
    });
  }
}