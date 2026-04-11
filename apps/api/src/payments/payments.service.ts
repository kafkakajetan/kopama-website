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
    const sandbox = this.config.get<string>('P24_SANDBOX') === 'true';

    return {
      merchantId: Number(merchantId),
      posId: Number(posId),
      crc,
      apiKey,
      baseUrl,
      returnUrl,
      statusUrl,
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

    const publicPriceRule = enrollment.offerItem.priceRules.find(
      (rule) => rule.customerType === 'PUBLIC',
    );

    if (!publicPriceRule) {
      throw new BadRequestException(
        'Brak ceny publicznej dla wybranego kursu.',
      );
    }

    const amountGrosze = this.priceZlotyToGrosze(
      publicPriceRule.priceZloty.toString(),
    );

    const currency = 'PLN';
    const sessionId = `enrollment-${enrollment.id}-${Date.now()}`;

    const config = this.getConfig();
    const merchantId = config.merchantId;
    const posId = config.posId;
    const baseUrl = config.baseUrl;
    const returnUrl = config.returnUrl;
    const statusUrl = config.statusUrl;

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
        description: `Kurs ${enrollment.offerItem.name}`,
        email: enrollment.email,
        client: `${enrollment.firstName} ${enrollment.lastName}`,
        address: enrollment.addressLine1,
        zip: enrollment.postalCode,
        city: enrollment.city,
        country: 'PL',
        phone: enrollment.phone,
        language: enrollment.offerItem.language === 'EN' ? 'en' : 'pl',
        urlReturn: `${returnUrl}?enrollmentId=${encodeURIComponent(enrollment.id)}`,
        urlStatus: `${statusUrl}?enrollmentId=${encodeURIComponent(enrollment.id)}`,
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
      paymentUrl: `${baseUrl}/trnRequest/${token}`,
      amountGrosze,
      currency,
      sessionId,
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
