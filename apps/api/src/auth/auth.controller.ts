import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

type RequestWithCookies = Request & { cookies?: Record<string, string> };

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private jwt: JwtService,
  ) {}

  @Post('login')
  async login(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase();
    const password = String(body.password ?? '');
    if (!email || !password)
      throw new UnauthorizedException('Nieprawidłowy email lub hasło.');

    const user = await this.auth.validateUser(email, password);
    const token = this.auth.signToken(user.id);

    res.cookie('access_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
    });

    return { ok: true };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', { path: '/' });
    return { ok: true };
  }

  @Get('me')
  async me(@Req() req: RequestWithCookies) {
    const tokenRaw: unknown = req.cookies?.access_token;
    const token = typeof tokenRaw === 'string' ? tokenRaw : undefined;
    if (!token) throw new UnauthorizedException();
    if (!token) throw new UnauthorizedException();

    const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
    const user = await this.auth.getUserById(payload.sub);
    if (!user) throw new UnauthorizedException();

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };
  }
}
