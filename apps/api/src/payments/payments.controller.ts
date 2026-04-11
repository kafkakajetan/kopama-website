import { Controller, Param, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments/p24')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('enrollments/:id/register')
  registerEnrollment(@Param('id') id: string) {
    return this.payments.registerEnrollmentPayment(id);
  }
}
