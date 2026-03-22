import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

type ReqWithCookies = Request & { cookies?: Record<string, unknown> };

@Injectable()
export class JwtCookieGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<ReqWithCookies>();

    const cookies = req.cookies as Record<string, unknown> | undefined;
    const tokenRaw = cookies?.access_token;
    const token = typeof tokenRaw === 'string' ? tokenRaw : undefined;

    if (!token) throw new UnauthorizedException();

    const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) throw new UnauthorizedException();

    (
      req as Request & { user: { id: string; role: string; email: string } }
    ).user = {
      id: user.id,
      role: user.role,
      email: user.email,
    };

    return true;
  }
}
