import { Controller, Get, Body, HttpCode, Param, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments/p24')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('enrollments/:id/register')
  registerEnrollment(@Param('id') id: string) {
    return this.payments.registerEnrollmentPayment(id);
  }

  @Get('enrollments/:id/status')
  getEnrollmentStatus(@Param('id') id: string) {
    return this.payments.getEnrollmentPaymentStatus(id);
  }

  @Post('status')
  @HttpCode(200)
  handleStatus(@Body() body: Record<string, unknown>) {
    return this.payments.handleStatusNotification(body);
  }
}
