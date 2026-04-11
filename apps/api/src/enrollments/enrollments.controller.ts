import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import {
  EnrollmentsService,
  type CreateEnrollmentResult,
} from './enrollments.service';

@Controller('enrollments')
export class EnrollmentsController {
  constructor(private readonly service: EnrollmentsService) {}

  @Post(':id/mock-pay')
  mockPay(@Param('id') id: string) {
    return this.service.mockPay(id);
  }

  @Post()
  create(
    @Body() dto: CreateEnrollmentDto,
    @Req() req: Request,
  ): Promise<CreateEnrollmentResult> {
    return this.service.create(dto, req.ip);
  }
}
