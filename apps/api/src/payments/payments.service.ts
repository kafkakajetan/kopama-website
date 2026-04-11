import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentsService {
  constructor(private readonly config: ConfigService) {}

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
