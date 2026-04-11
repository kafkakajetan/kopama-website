import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtCookieGuard } from '../auth/jwt-cookie.guard';
import { MeService } from './me.service';

type ReqWithUser = Request & {
  user: { id: string; role: string; email: string };
};

@Controller('me')
@UseGuards(JwtCookieGuard)
export class MeController {
  constructor(private readonly me: MeService) {}

  @Get()
  getMe(@Req() req: ReqWithUser) {
    return this.me.getMe(req.user.id);
  }

  @Get('enrollments')
  getMyEnrollments(@Req() req: ReqWithUser) {
    return this.me.getMyEnrollments(req.user.id);
  }

  @Patch()
  updateMe(
    @Req() req: ReqWithUser,
    @Body() body: { email?: string; phone?: string },
  ) {
    return this.me.updateMe(req.user.id, body);
  }

  @Patch('password')
  updatePassword(
    @Req() req: ReqWithUser,
    @Body() body: { currentPassword?: string; newPassword?: string },
  ) {
    return this.me.updatePassword(req.user.id, body);
  }
}
