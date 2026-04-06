import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtCookieGuard } from '../auth/jwt-cookie.guard';
import { AdminGuard } from '../auth/admin.guard';
import { CourseStartSlotsService } from './course-start-slots.service';

@Controller()
export class CourseStartSlotsController {
  constructor(private readonly service: CourseStartSlotsService) {}

  @Get('admin/course-start-slots')
  @UseGuards(JwtCookieGuard, AdminGuard)
  listForAdmin(@Query('courseCategoryId') courseCategoryId: string) {
    return this.service.listForAdmin(courseCategoryId);
  }

  @Post('admin/course-start-slots')
  @UseGuards(JwtCookieGuard, AdminGuard)
  create(
    @Body()
    body: {
      courseCategoryId?: string;
      startDate?: string;
      notes?: string;
    },
  ) {
    return this.service.create(body);
  }

  @Delete('admin/course-start-slots/:id')
  @UseGuards(JwtCookieGuard, AdminGuard)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Get('course-start-slots/public')
  listPublic(@Query('offerItemCode') offerItemCode: string) {
    return this.service.listPublicByOfferItemCode(offerItemCode);
  }
}
