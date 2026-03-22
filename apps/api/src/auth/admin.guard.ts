import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

type ReqWithUser = Request & {
  user?: {
    id: string;
    role: string;
    email: string;
  };
};

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<ReqWithUser>();

    if (!req.user) {
      throw new UnauthorizedException();
    }

    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Brak dostępu do panelu administratora.');
    }

    return true;
  }
}
