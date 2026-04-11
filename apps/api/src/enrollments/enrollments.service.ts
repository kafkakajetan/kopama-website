import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { CourseStartSlotsService } from '../course-start-slots/course-start-slots.service';

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
};

export type CreateEnrollmentResult = EnrollmentWithCategory & {
  userCreated?: boolean;
  tempPassword?: string;
};

@Injectable()
export class EnrollmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly courseStartSlotsService: CourseStartSlotsService,
  ) {}

  async create(
    dto: CreateEnrollmentDto,
    ip?: string,
  ): Promise<CreateEnrollmentResult> {
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

    const isElearning = dto.courseMode === 'ELEARNING';
    const minCourseStartAt = addMonths(birthDate, 16 * 12 + 9);

    let courseStartDate: Date | null = null;

    if (!isElearning) {
      if (!dto.courseStartDate) {
        throw new BadRequestException('Wybierz termin kursu.');
      }

      const normalizedCourseStartDate =
        this.courseStartSlotsService.normalizeCourseStartDate(
          dto.courseStartDate,
        );

      if (Number.isNaN(normalizedCourseStartDate.getTime())) {
        throw new BadRequestException('Nieprawidłowy termin kursu.');
      }

      if (isBefore(normalizedCourseStartDate, minCourseStartAt)) {
        throw new BadRequestException(
          'Termin kursu musi przypadać najwcześniej w dniu ukończenia 16 lat i 9 miesięcy.',
        );
      }

      courseStartDate = normalizedCourseStartDate;
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

    if (dto.hasTramPermit) {
      if (!dto.tramPermitNumber) {
        throw new BadRequestException(
          'Jeśli kursant posiada uprawnienia do kierowania tramwajem, wymagany jest numer uprawnień.',
        );
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

    const normalizedEmail = dto.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    const isBAfterB1 = offer.courseCategory?.code === 'B_AFTER_B1';
    const hasOtherDrivingLicense = isBAfterB1 || dto.hasOtherDrivingLicense;

    if (isBAfterB1) {
      if (!dto.otherDrivingLicenseNumber?.trim()) {
        throw new BadRequestException(
          'Dla kursu Kat. B po B1 wymagany jest numer prawa jazdy kategorii B1.',
        );
      }
    } else if (dto.hasOtherDrivingLicense) {
      if (!dto.otherDrivingLicenseCategory || !dto.otherDrivingLicenseNumber) {
        throw new BadRequestException(
          'Jeśli kursant posiada prawo jazdy innej kategorii, wymagane są kategoria i numer prawa jazdy.',
        );
      }
    }

    if (!isElearning) {
      const availableStartSlot = await this.prisma.courseStartSlot.findFirst({
        where: {
          offerItemId: offer.id,
          startDate: courseStartDate!,
          isActive: true,
        },
        select: { id: true },
      });

      if (!availableStartSlot) {
        throw new BadRequestException(
          'Wybrany termin kursu nie jest dostępny.',
        );
      }
    }

    const guardianSameAddress = dto.guardianSameAddress === true;

    let createdEnrollment = await this.prisma.enrollment.create({
      data: {
        status: 'PAYMENT_PENDING',
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: normalizedEmail,
        userId: existingUser?.id ?? null,
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

        hasOtherDrivingLicense: hasOtherDrivingLicense,
        otherDrivingLicenseCategory: hasOtherDrivingLicense
          ? isBAfterB1
            ? 'B1'
            : (dto.otherDrivingLicenseCategory ?? null)
          : null,
        otherDrivingLicenseNumber: hasOtherDrivingLicense
          ? (dto.otherDrivingLicenseNumber ?? null)
          : null,

        hasTramPermit: dto.hasTramPermit,
        tramPermitNumber: dto.hasTramPermit
          ? (dto.tramPermitNumber ?? null)
          : null,

        wantsCashPayment: dto.wantsCashPayment,

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

    let tempPassword: string | undefined;
    let userCreated = false;

    if (dto.wantsCashPayment && !existingUser) {
      tempPassword = `Test${randomBytes(3).toString('hex')}!1`;
      const passwordHash = await this.auth.hashPassword(tempPassword);

      const createdUser = await this.prisma.user.create({
        data: {
          email: normalizedEmail,
          phone: dto.phone,
          role: 'STUDENT',
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
        },
        select: { id: true },
      });

      createdEnrollment = await this.prisma.enrollment.update({
        where: { id: createdEnrollment.id },
        data: { userId: createdUser.id },
        include: {
          courseCategory: true,
          offerItem: true,
        },
      });

      userCreated = true;
    }

    return {
      ...createdEnrollment,
      ...(dto.wantsCashPayment ? { userCreated, tempPassword } : {}),
    };
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
      select: { id: true },
    });

    let tempPassword: string | undefined;
    let userCreated = false;
    let linkedUserId = existingUser?.id ?? null;

    if (!existingUser) {
      tempPassword = `Test${randomBytes(3).toString('hex')}!1`;
      const passwordHash = await this.auth.hashPassword(tempPassword);

      const createdUser = await this.prisma.user.create({
        data: {
          email,
          phone: enrollment.phone,
          role: 'STUDENT',
          passwordHash,
          firstName: enrollment.firstName,
          lastName: enrollment.lastName,
        },
        select: { id: true },
      });

      linkedUserId = createdUser.id;
      userCreated = true;
    }

    if (linkedUserId) {
      await this.prisma.enrollment.update({
        where: { id: enrollmentId },
        data: { userId: linkedUserId },
      });
    }

    return {
      ok: true,
      enrollmentId,
      email,
      userCreated,
      tempPassword,
    };
  }
}
