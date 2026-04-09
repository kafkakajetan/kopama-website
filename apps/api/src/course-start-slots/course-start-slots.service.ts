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

  async listForAdmin(offerItemId: string) {
    if (!offerItemId) {
      throw new BadRequestException('Brak offerItemId.');
    }

    return this.prisma.courseStartSlot.findMany({
      where: { offerItemId },
      orderBy: { startDate: 'asc' },
      select: {
        id: true,
        startDate: true,
        isActive: true,
        notes: true,
        offerItemId: true,
        offerItem: {
          select: {
            id: true,
            code: true,
            name: true,
            language: true,
            courseCategory: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async create(body: {
    offerItemId?: string;
    startDate?: string;
    notes?: string;
  }) {
    const offerItemId = String(body.offerItemId ?? '').trim();
    const startDateRaw = String(body.startDate ?? '').trim();
    const notes = body.notes ? String(body.notes).trim() : null;

    if (!offerItemId) {
      throw new BadRequestException('Wybierz kurs.');
    }

    if (!startDateRaw) {
      throw new BadRequestException('Wybierz termin rozpoczęcia kursu.');
    }

    const offerItem = await this.prisma.offerItem.findUnique({
      where: { id: offerItemId },
      select: {
        id: true,
        code: true,
        name: true,
        language: true,
        courseCategory: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    if (!offerItem) {
      throw new NotFoundException('Nie znaleziono oferty kursu.');
    }

    const startDate = normalizeCourseStartDate(startDateRaw);

    return this.prisma.courseStartSlot.upsert({
      where: {
        offerItemId_startDate: {
          offerItemId,
          startDate,
        },
      },
      update: {
        isActive: true,
        notes,
      },
      create: {
        offerItemId,
        startDate,
        isActive: true,
        notes,
      },
      select: {
        id: true,
        startDate: true,
        isActive: true,
        notes: true,
        offerItemId: true,
        offerItem: {
          select: {
            id: true,
            code: true,
            name: true,
            language: true,
            courseCategory: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
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
      },
    });

    if (!offer) {
      throw new NotFoundException('Nie znaleziono kursu.');
    }

    return this.prisma.courseStartSlot.findMany({
      where: {
        offerItemId: offer.id,
        isActive: true,
      },
      orderBy: { startDate: 'asc' },
      select: {
        id: true,
        startDate: true,
        offerItemId: true,
      },
    });
  }

  normalizeCourseStartDate(value: string): Date {
    return normalizeCourseStartDate(value);
  }
}
