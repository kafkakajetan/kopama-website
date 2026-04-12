import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export type RegisterEnrollmentPaymentResult = {
  token: string;
  paymentUrl: string;
  amountGrosze: number;
  currency: string;
  sessionId: string;
};

type P24RegisterResponse = {
  data?: {
    token?: unknown;
  };
  error?: unknown;
  message?: unknown;
} | null;

type P24VerifyResponse = {
  data?: {
    status?: unknown;
  };
  error?: unknown;
  message?: unknown;
} | null;

type P24StatusNotificationBody = {
  merchantId?: unknown;
  posId?: unknown;
  sessionId?: unknown;
  amount?: unknown;
  currency?: unknown;
  orderId?: unknown;
  methodId?: unknown;
  statement?: unknown;
  sign?: unknown;
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  getConfig() {
    const merchantId = this.requireEnv('P24_MERCHANT_ID');
    const posId = this.requireEnv('P24_POS_ID');
    const crc = this.requireEnv('P24_CRC');
    const apiKey = this.requireEnv('P24_API_KEY');
    const baseUrl = this.requireEnv('P24_BASE_URL');
    const returnUrl = this.requireEnv('P24_RETURN_URL');
    const statusUrl = this.requireEnv('P24_STATUS_URL');
    const paymentBaseUrl =
      this.config.get<string>('P24_PAYMENT_BASE_URL')?.trim() || baseUrl;
    const sandbox = this.config.get<string>('P24_SANDBOX') === 'true';

    return {
      merchantId: Number(merchantId),
      posId: Number(posId),
      crc,
      apiKey,
      baseUrl,
      returnUrl,
      statusUrl,
      paymentBaseUrl,
      sandbox,
    };
  }

  getAuthHeader() {
    const { posId, apiKey } = this.getConfig();
    const basic = Buffer.from(`${posId}:${apiKey}`).toString('base64');
    return `Basic ${basic}`;
  }

  async registerEnrollmentPayment(
    enrollmentId: string,
  ): Promise<RegisterEnrollmentPaymentResult> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        offerItem: {
          include: {
            priceRules: true,
          },
        },
        payment: true,
      },
    });

    if (!enrollment) {
      throw new BadRequestException('Nie znaleziono zapisu.');
    }

    if (enrollment.wantsCashPayment) {
      throw new BadRequestException(
        'Dla płatności gotówką nie rejestrujemy płatności online.',
      );
    }

    if (enrollment.status === 'PAID') {
      throw new BadRequestException('Ten zapis jest już opłacony.');
    }

    const { amountGrosze, currency, description } =
      this.resolveEnrollmentPaymentData(enrollment);

    const { merchantId, posId, baseUrl, returnUrl, statusUrl, paymentBaseUrl } =
      this.getConfig();

    const sessionId = `enrollment-${enrollment.id}-${Date.now()}`;

    const sign = this.createRegisterSign({
      sessionId,
      merchantId,
      amount: amountGrosze,
      currency,
    });

    const response = await fetch(`${baseUrl}/api/v1/transaction/register`, {
      method: 'POST',
      headers: {
        Authorization: this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        merchantId,
        posId,
        sessionId,
        amount: amountGrosze,
        currency,
        description,
        email: enrollment.email,
        client: `${enrollment.firstName} ${enrollment.lastName}`,
        address: enrollment.addressLine1,
        zip: enrollment.postalCode,
        city: enrollment.city,
        country: 'PL',
        phone: enrollment.phone,
        language: enrollment.offerItem.language === 'EN' ? 'en' : 'pl',
        urlReturn: `${returnUrl}?enrollmentId=${encodeURIComponent(enrollment.id)}`,
        urlStatus: statusUrl,
        timeLimit: 15,
        sign,
      }),
    });

    const responseBody = (await response
      .json()
      .catch(() => null)) as P24RegisterResponse;

    if (!response.ok) {
      const message =
        typeof responseBody?.error === 'string'
          ? responseBody.error
          : typeof responseBody?.message === 'string'
            ? responseBody.message
            : 'Nie udało się zarejestrować płatności w Przelewy24.';

      throw new BadRequestException(message);
    }

    const token =
      typeof responseBody?.data?.token === 'string'
        ? responseBody.data.token
        : null;

    if (!token) {
      throw new BadRequestException(
        'Przelewy24 nie zwróciło tokenu płatności.',
      );
    }

    await this.prisma.paymentTransaction.upsert({
      where: { enrollmentId: enrollment.id },
      update: {
        status: 'REGISTERED',
        amountGrosze,
        currency,
        p24SessionId: sessionId,
        rawPayload: responseBody as Prisma.InputJsonValue,
      },
      create: {
        enrollmentId: enrollment.id,
        status: 'REGISTERED',
        amountGrosze,
        currency,
        p24SessionId: sessionId,
        rawPayload: responseBody as Prisma.InputJsonValue,
      },
    });

    return {
      token,
      paymentUrl: `${paymentBaseUrl.replace(/\/$/, '')}/trnRequest/${token}`,
      amountGrosze,
      currency,
      sessionId,
    };
  }

  async handleStatusNotification(body: P24StatusNotificationBody) {
    const sessionId =
      typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
    const currency =
      typeof body.currency === 'string' ? body.currency.trim() : '';
    const sign = typeof body.sign === 'string' ? body.sign.trim() : '';
    const amount = Number(body.amount);
    const orderId = Number(body.orderId);

    if (!sessionId || !currency || !sign) {
      throw new BadRequestException(
        'Brak wymaganych danych w powiadomieniu P24.',
      );
    }

    if (Number.isNaN(amount) || Number.isNaN(orderId)) {
      throw new BadRequestException(
        'Nieprawidłowe dane kwoty lub orderId w powiadomieniu P24.',
      );
    }

    const payment = await this.prisma.paymentTransaction.findUnique({
      where: { p24SessionId: sessionId },
      include: {
        enrollment: {
          include: {
            offerItem: {
              include: {
                priceRules: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new BadRequestException(
        'Nie znaleziono płatności dla podanego sessionId.',
      );
    }

    const expectedPayment = this.resolveEnrollmentPaymentData(
      payment.enrollment,
    );

    if (amount !== expectedPayment.amountGrosze) {
      throw new BadRequestException(
        'Kwota z webhooka nie zgadza się z zapisem.',
      );
    }

    const expectedSign = this.createVerifySign({
      sessionId,
      orderId,
      amount,
      currency,
    });

    if (expectedSign !== sign) {
      throw new BadRequestException(
        'Nieprawidłowy podpis powiadomienia Przelewy24.',
      );
    }

    if (payment.status === 'SUCCESS' && payment.enrollment.status === 'PAID') {
      return { ok: true };
    }

    const { merchantId, posId, baseUrl } = this.getConfig();

    const verifySign = this.createVerifySign({
      sessionId,
      orderId,
      amount,
      currency,
    });

    const verifyResponse = await fetch(`${baseUrl}/api/v1/transaction/verify`, {
      method: 'PUT',
      headers: {
        Authorization: this.getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        merchantId,
        posId,
        sessionId,
        amount,
        currency,
        orderId,
        sign: verifySign,
      }),
    });

    const verifyBody = (await verifyResponse
      .json()
      .catch(() => null)) as P24VerifyResponse;

    if (!verifyResponse.ok) {
      await this.prisma.paymentTransaction.update({
        where: { id: payment.id },
        data: {
          status: 'ERROR',
          p24OrderId: String(orderId),
          lastWebhookAt: new Date(),
          rawPayload: body as Prisma.InputJsonValue,
        },
      });

      const message =
        typeof verifyBody?.error === 'string'
          ? verifyBody.error
          : typeof verifyBody?.message === 'string'
            ? verifyBody.message
            : 'Przelewy24 odrzuciło weryfikację płatności.';

      throw new BadRequestException(message);
    }

    if (
      typeof verifyBody?.data?.status === 'string' &&
      verifyBody.data.status !== 'success'
    ) {
      throw new BadRequestException(
        'Płatność nie została potwierdzona przez P24.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.paymentTransaction.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCESS',
          p24OrderId: String(orderId),
          lastWebhookAt: new Date(),
          rawPayload: body as Prisma.InputJsonValue,
        },
      }),
      this.prisma.enrollment.update({
        where: { id: payment.enrollmentId },
        data: { status: 'PAID' },
      }),
    ]);

    return { ok: true };
  }

  private resolveEnrollmentPaymentData(enrollment: {
    wantsInstallments: boolean;
    courseMode: 'STATIONARY' | 'ELEARNING';
    offerItem: {
      name: string;
      fullPriceZloty?: { toString(): string } | string | null;
      fullPriceElearningZloty?: { toString(): string } | string | null;
      firstInstallmentPriceZloty?: { toString(): string } | string | null;
      firstInstallmentPriceElearningZloty?:
        | { toString(): string }
        | string
        | null;
      priceRules: Array<{
        customerType: string;
        priceZloty: { toString(): string };
      }>;
    };
  }) {
    const publicPriceRule = enrollment.offerItem.priceRules.find(
      (rule) => rule.customerType === 'PUBLIC',
    );

    const fallbackFullPrice = publicPriceRule?.priceZloty?.toString() ?? null;

    const fullPriceRaw =
      enrollment.courseMode === 'ELEARNING'
        ? (this.decimalToString(enrollment.offerItem.fullPriceElearningZloty) ??
          this.decimalToString(enrollment.offerItem.fullPriceZloty) ??
          fallbackFullPrice)
        : (this.decimalToString(enrollment.offerItem.fullPriceZloty) ??
          fallbackFullPrice);

    const firstInstallmentRaw =
      enrollment.courseMode === 'ELEARNING'
        ? (this.decimalToString(
            enrollment.offerItem.firstInstallmentPriceElearningZloty,
          ) ??
          this.decimalToString(enrollment.offerItem.firstInstallmentPriceZloty))
        : this.decimalToString(enrollment.offerItem.firstInstallmentPriceZloty);

    const selectedPrice = enrollment.wantsInstallments
      ? firstInstallmentRaw
      : fullPriceRaw;

    if (!selectedPrice) {
      throw new BadRequestException(
        enrollment.wantsInstallments
          ? 'Brak ceny pierwszej raty dla wybranego kursu.'
          : 'Brak pełnej ceny dla wybranego kursu.',
      );
    }

    return {
      amountGrosze: this.priceZlotyToGrosze(selectedPrice),
      currency: 'PLN',
      description: enrollment.wantsInstallments
        ? `I rata kursu ${enrollment.offerItem.name}`
        : `Kurs ${enrollment.offerItem.name}`,
    };
  }

  private createRegisterSign(input: {
    sessionId: string;
    merchantId: number;
    amount: number;
    currency: string;
  }) {
    const { crc } = this.getConfig();

    const payload = JSON.stringify({
      sessionId: input.sessionId,
      merchantId: input.merchantId,
      amount: input.amount,
      currency: input.currency,
      crc,
    });

    return createHash('sha384').update(payload, 'utf8').digest('hex');
  }

  private createVerifySign(input: {
    sessionId: string;
    orderId: number;
    amount: number;
    currency: string;
  }) {
    const { crc } = this.getConfig();

    const payload = JSON.stringify({
      sessionId: input.sessionId,
      orderId: input.orderId,
      amount: input.amount,
      currency: input.currency,
      crc,
    });

    return createHash('sha384').update(payload, 'utf8').digest('hex');
  }

  private decimalToString(
    value?: { toString(): string } | string | null,
  ): string | null {
    if (value == null) return null;
    return typeof value === 'string' ? value : value.toString();
  }

  private priceZlotyToGrosze(priceZloty: string) {
    const value = Number.parseFloat(priceZloty);

    if (Number.isNaN(value)) {
      throw new BadRequestException('Nieprawidłowa cena kursu.');
    }

    return Math.round(value * 100);
  }

  private requireEnv(name: string): string {
    const value = this.config.get<string>(name);

    if (!value || !value.trim()) {
      throw new InternalServerErrorException(
        `Brak wymaganej zmiennej środowiskowej ${name}.`,
      );
    }

    return value.trim();
  }
}
