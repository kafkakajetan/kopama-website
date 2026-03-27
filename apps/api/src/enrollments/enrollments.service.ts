import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { AuthService } from '../auth/auth.service';
import { ContractPdfService } from '../contracts/contract-pdf.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() !== day) d.setDate(0);
  return d;
}

function isBefore(a: Date, b: Date): boolean {
  return a.getTime() < b.getTime();
}

export type EnrollmentWithCategory = Prisma.EnrollmentGetPayload<{
  include: { courseCategory: true; offerItem: true };
}>;

export type MockPayResult = {
  ok: true;
  enrollmentId: string;
  email: string;
  userCreated: boolean;
  tempPassword?: string;
  contractKey: string;
};

@Injectable()
export class EnrollmentsService {
  private readonly logger = new Logger(EnrollmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly contractPdf: ContractPdfService,
    private readonly mailService: MailService,
  ) {}

  async create(
    dto: CreateEnrollmentDto,
    ip?: string,
  ): Promise<EnrollmentWithCategory> {
    if (!dto.acceptedTerms || !dto.acceptedPrivacy) {
      throw new BadRequestException(
        'Wymagana akceptacja regulaminu i polityki prywatności.',
      );
    }
    if (!dto.acceptedSalesTerms) {
      throw new BadRequestException(
        'Wymagana akceptacja regulaminu sprzedaży.',
      );
    }

    const birthDate = new Date(dto.birthDate);
    if (Number.isNaN(birthDate.getTime())) {
      throw new BadRequestException('Nieprawidłowa data urodzenia.');
    }

    const now = new Date();
    const minPurchaseAt = addMonths(birthDate, 16 * 12 + 7);
    if (isBefore(now, minPurchaseAt)) {
      throw new BadRequestException(
        'Minimalny wiek do zakupu kursu to 16 lat i 7 miesięcy.',
      );
    }

    const minCourseStartAt = addMonths(birthDate, 16 * 12 + 9);
    const courseStartDate = new Date(dto.courseStartDate);
    if (Number.isNaN(courseStartDate.getTime())) {
      throw new BadRequestException('Nieprawidłowy termin kursu.');
    }
    if (isBefore(courseStartDate, minCourseStartAt)) {
      throw new BadRequestException(
        'Termin kursu musi przypadać najwcześniej w dniu ukończenia 16 lat i 9 miesięcy.',
      );
    }

    const adultAtPurchase = !isBefore(now, addMonths(birthDate, 18 * 12));
    const isMinor = !adultAtPurchase;

    if (isMinor) {
      const missing =
        !dto.guardianPesel ||
        !dto.guardianFirstName ||
        !dto.guardianLastName ||
        !dto.guardianPhone;

      if (missing) {
        throw new BadRequestException(
          'Dla osoby niepełnoletniej wymagane są dane opiekuna prawnego.',
        );
      }

      const sameAddress = dto.guardianSameAddress === true;

      if (!sameAddress) {
        const missingAddr =
          !dto.guardianAddressLine1 ||
          !dto.guardianCity ||
          !dto.guardianPostalCode;

        if (missingAddr) {
          throw new BadRequestException(
            'Dla osoby niepełnoletniej wymagany jest adres zamieszkania opiekuna.',
          );
        }
      }
    }

    const offer = await this.prisma.offerItem.findUnique({
      where: { code: dto.offerItemCode },
      include: { courseCategory: true },
    });

    if (!offer || !offer.isActive || offer.type !== 'COURSE') {
      throw new BadRequestException('Nieprawidłowy kurs.');
    }
    if (!offer.courseCategoryId) {
      throw new BadRequestException('Kurs nie ma przypisanej kategorii.');
    }
    if (
      dto.courseCategoryId &&
      dto.courseCategoryId !== offer.courseCategoryId
    ) {
      throw new BadRequestException(
        'Wybrana kategoria nie pasuje do wybranego kursu.',
      );
    }

    const guardianSameAddress = dto.guardianSameAddress === true;

    return this.prisma.enrollment.create({
      data: {
        status: 'PAYMENT_PENDING',
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone,
        pesel: dto.pesel,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2 ?? null,
        city: dto.city,
        postalCode: dto.postalCode,
        acceptedTermsAt: new Date(),
        acceptedPrivacyAt: new Date(),
        acceptedSalesTermsAt: new Date(),
        acceptedSalesTermsVersion: 'v1',
        acceptedIp: ip ?? null,

        birthDate,
        courseMode: dto.courseMode,
        courseStartDate,
        isMinorAtPurchase: isMinor,

        guardianSameAddress,

        guardianPesel: isMinor ? dto.guardianPesel : null,
        guardianFirstName: isMinor ? dto.guardianFirstName : null,
        guardianLastName: isMinor ? dto.guardianLastName : null,
        guardianPhone: isMinor ? dto.guardianPhone : null,

        guardianAddressLine1: isMinor
          ? guardianSameAddress
            ? dto.addressLine1
            : (dto.guardianAddressLine1 ?? null)
          : null,
        guardianAddressLine2: isMinor
          ? guardianSameAddress
            ? (dto.addressLine2 ?? null)
            : (dto.guardianAddressLine2 ?? null)
          : null,
        guardianCity: isMinor
          ? guardianSameAddress
            ? dto.city
            : (dto.guardianCity ?? null)
          : null,
        guardianPostalCode: isMinor
          ? guardianSameAddress
            ? dto.postalCode
            : (dto.guardianPostalCode ?? null)
          : null,

        courseCategoryId: offer.courseCategoryId,
        offerItemId: offer.id,
      },
      include: {
        courseCategory: true,
        offerItem: true,
      },
    });
  }

  async mockPay(enrollmentId: string): Promise<MockPayResult> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { offerItem: true },
    });

    if (!enrollment) {
      throw new BadRequestException('Nie znaleziono zapisu.');
    }

    await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status: 'PAID' },
    });

    const email = enrollment.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    let tempPassword: string | undefined;
    let userCreated = false;

    if (!existingUser) {
      tempPassword = `Test${randomBytes(3).toString('hex')}!1`;
      const passwordHash = await this.auth.hashPassword(tempPassword);

      await this.prisma.user.create({
        data: {
          email,
          phone: enrollment.phone,
          role: 'STUDENT',
          passwordHash,
        },
      });

      userCreated = true;
    }

    const dir = path.join(process.cwd(), 'storage', 'contracts');
    await fs.mkdir(dir, { recursive: true });

    const contractKey = `contract_${enrollmentId}.txt`;
    const filePath = path.join(dir, contractKey);

    const content =
      `UMOWA (TEST)\n` +
      `Zapis: ${enrollment.id}\n` +
      `Kurs: ${enrollment.offerItem.name}\n` +
      `Kursant: ${enrollment.firstName} ${enrollment.lastName}\n` +
      `PESEL: ${enrollment.pesel}\n` +
      `Email: ${enrollment.email}\n` +
      `Telefon: ${enrollment.phone}\n` +
      `Adres: ${enrollment.addressLine1}${enrollment.addressLine2 ? ' ' + enrollment.addressLine2 : ''}, ${enrollment.postalCode} ${enrollment.city}\n`;

    await fs.writeFile(filePath, content, 'utf8');

    await this.prisma.contractDocument.upsert({
      where: { enrollmentId },
      update: {
        status: 'GENERATED',
        storageKey: contractKey,
        generatedAt: new Date(),
      },
      create: {
        enrollmentId,
        status: 'GENERATED',
        storageKey: contractKey,
        generatedAt: new Date(),
        templateVer: 'v1',
        fileHash: null,
      },
    });

    const fullName = `${enrollment.firstName} ${enrollment.lastName}`;
    const address =
      `${enrollment.addressLine1}` +
      `${enrollment.addressLine2 ? ` ${enrollment.addressLine2}` : ''}, ` +
      `${enrollment.postalCode} ${enrollment.city}`;

    const pdf = await this.contractPdf.generateTestContractPdf({
      fileId: enrollment.id,
      fullName,
      email: enrollment.email,
      phone: enrollment.phone,
      pesel: enrollment.pesel,
      address,
      courseName: enrollment.offerItem.name,
    });

    try {
      await this.mailService.sendContractEmail({
        to: email,
        fullName,
        contractAbsolutePath: pdf.absolutePath,
        loginEmail: userCreated ? email : undefined,
        plainPassword: userCreated ? tempPassword : undefined,
      });
    } catch (error: unknown) {
      this.logger.error('Nie udało się wysłać maila z umową PDF.', error);
    }

    return {
      ok: true,
      enrollmentId,
      email,
      userCreated,
      tempPassword,
      contractKey,
    };
  }
}
