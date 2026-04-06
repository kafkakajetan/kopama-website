import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function normalizeCourseStartDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) {
    throw new BadRequestException('Nieprawidłowa data terminu kursu.');
  }

  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

@Injectable()
export class CourseStartSlotsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForAdmin(courseCategoryId: string) {
    if (!courseCategoryId) {
      throw new BadRequestException('Brak courseCategoryId.');
    }

    return this.prisma.courseStartSlot.findMany({
      where: { courseCategoryId },
      orderBy: { startDate: 'asc' },
      select: {
        id: true,
        startDate: true,
        isActive: true,
        notes: true,
        courseCategoryId: true,
        courseCategory: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });
  }

  async create(body: {
    courseCategoryId?: string;
    startDate?: string;
    notes?: string;
  }) {
    const courseCategoryId = String(body.courseCategoryId ?? '').trim();
    const startDateRaw = String(body.startDate ?? '').trim();
    const notes = body.notes ? String(body.notes).trim() : null;

    if (!courseCategoryId) {
      throw new BadRequestException('Wybierz kategorię kursu.');
    }

    if (!startDateRaw) {
      throw new BadRequestException('Wybierz termin rozpoczęcia kursu.');
    }

    const courseCategory = await this.prisma.courseCategory.findUnique({
      where: { id: courseCategoryId },
      select: { id: true, code: true, name: true },
    });

    if (!courseCategory) {
      throw new NotFoundException('Nie znaleziono kategorii kursu.');
    }

    const startDate = normalizeCourseStartDate(startDateRaw);

    return this.prisma.courseStartSlot.upsert({
      where: {
        courseCategoryId_startDate: {
          courseCategoryId,
          startDate,
        },
      },
      update: {
        isActive: true,
        notes,
      },
      create: {
        courseCategoryId,
        startDate,
        isActive: true,
        notes,
      },
      select: {
        id: true,
        startDate: true,
        isActive: true,
        notes: true,
        courseCategoryId: true,
        courseCategory: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.courseStartSlot.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Nie znaleziono terminu.');
    }

    await this.prisma.courseStartSlot.delete({
      where: { id },
    });

    return { ok: true };
  }

  async listPublicByOfferItemCode(offerItemCode: string) {
    const code = String(offerItemCode ?? '').trim();

    if (!code) {
      throw new BadRequestException('Brak offerItemCode.');
    }

    const offer = await this.prisma.offerItem.findUnique({
      where: { code },
      select: {
        id: true,
        code: true,
        courseCategoryId: true,
      },
    });

    if (!offer || !offer.courseCategoryId) {
      throw new NotFoundException('Nie znaleziono kursu.');
    }

    return this.prisma.courseStartSlot.findMany({
      where: {
        courseCategoryId: offer.courseCategoryId,
        isActive: true,
      },
      orderBy: { startDate: 'asc' },
      select: {
        id: true,
        startDate: true,
        courseCategoryId: true,
      },
    });
  }

  normalizeCourseStartDate(value: string): Date {
    return normalizeCourseStartDate(value);
  }
}
