import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  Body,
  Post,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtCookieGuard } from '../auth/jwt-cookie.guard';
import { AdminGuard } from '../auth/admin.guard';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtCookieGuard, AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('students')
  getStudents() {
    return this.admin.listStudents();
  }

  @Get('contracts')
  getContracts() {
    return this.admin.listContracts();
  }

  @Get('contracts/view')
  viewContract(@Query('path') relativePath: string) {
    return this.admin.readContract(relativePath);
  }

  @Get('contracts/download')
  downloadContract(@Query('path') relativePath: string, @Res() res: Response) {
    const absolutePath = this.admin.getContractAbsolutePath(relativePath);
    return res.download(absolutePath);
  }

  @Get('instructors')
  getInstructors() {
    return this.admin.listInstructors();
  }

  @Post('instructors')
  createInstructor(
    @Body()
    body: {
      email?: string;
      phone?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
      categoryCodes?: string[];
    },
  ) {
    return this.admin.createInstructor(body);
  }

  @Get('course-categories')
  getCourseCategories() {
    return this.admin.listCourseCategories();
  }
}
