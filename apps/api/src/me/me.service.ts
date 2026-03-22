import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, phone: true, role: true },
    });
  }

  async updateMe(userId: string, body: { email?: string; phone?: string }) {
    const email = body.email
      ? String(body.email).trim().toLowerCase()
      : undefined;
    const phone = body.phone ? String(body.phone).trim() : undefined;

    if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      throw new BadRequestException('Nieprawidłowy email.');
    }

    if (phone !== undefined && !/^\+48\d{9}$/.test(phone)) {
      throw new BadRequestException('Telefon musi mieć format +48 i 9 cyfr.');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(email !== undefined ? { email } : {}),
        ...(phone !== undefined ? { phone } : {}),
      },
      select: { id: true, email: true, phone: true, role: true },
    });
  }

  async updatePassword(
    userId: string,
    body: { currentPassword?: string; newPassword?: string },
  ) {
    const currentPassword = String(body.currentPassword ?? '');
    const newPassword = String(body.newPassword ?? '');

    if (!currentPassword || !newPassword) {
      throw new BadRequestException('Podaj obecne i nowe hasło.');
    }

    if (newPassword.length < 8) {
      throw new BadRequestException(
        'Nowe hasło musi mieć co najmniej 8 znaków.',
      );
    }

    if (currentPassword === newPassword) {
      throw new BadRequestException('Nowe hasło musi być inne niż obecne.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException();
    }

    const isValid: boolean = Boolean(
      await bcrypt.compare(currentPassword, user.passwordHash),
    );

    if (!isValid) {
      throw new BadRequestException('Obecne hasło jest nieprawidłowe.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { ok: true };
  }
}
