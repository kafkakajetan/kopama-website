import {
  Body,
  Controller,
  Get,
  HttpCode,
  Logger,
  Param,
  Post,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments/p24')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly payments: PaymentsService) {}

  @Post('enrollments/:id/register')
  registerEnrollment(@Param('id') id: string) {
    this.logger.log(`P24 register enrollmentId=${id}`);
    return this.payments.registerEnrollmentPayment(id);
  }

  @Get('enrollments/:id/status')
  getEnrollmentStatus(@Param('id') id: string) {
    this.logger.log(`P24 status check enrollmentId=${id}`);
    return this.payments.getEnrollmentPaymentStatus(id);
  }

  @Post('status')
  @HttpCode(200)
  handleStatus(@Body() body: Record<string, unknown>) {
    this.logger.log(`P24 STATUS BODY: ${JSON.stringify(body)}`);
    return this.payments.handleStatusNotification(body);
  }
}
