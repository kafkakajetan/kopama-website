import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { existsSync } from 'fs';
import { readdir, readFile, stat } from 'fs/promises';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listInstructors() {
    return this.prisma.user.findMany({
      where: { role: UserRole.INSTRUCTOR },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        email: true,
        phone: true,
        role: true,
      },
    });
  }

  async createInstructor(body: {
    email?: string;
    phone?: string;
    password?: string;
  }) {
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase();
    const phone = body.phone ? String(body.phone).trim() : null;
    const password = String(body.password ?? '');

    if (!email) {
      throw new BadRequestException('Email jest wymagany.');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      throw new BadRequestException('Nieprawidłowy email.');
    }

    if (phone && !/^\+48\d{9}$/.test(phone)) {
      throw new BadRequestException('Telefon musi mieć format +48 i 9 cyfr.');
    }

    if (password.length < 8) {
      throw new BadRequestException('Hasło musi mieć co najmniej 8 znaków.');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Użytkownik z tym emailem już istnieje.');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    return this.prisma.user.create({
      data: {
        email,
        phone,
        passwordHash,
        role: UserRole.INSTRUCTOR,
      },
      select: {
        id: true,
        createdAt: true,
        email: true,
        phone: true,
        role: true,
      },
    });
  }

  async listStudents() {
    return this.prisma.user.findMany({
      where: { role: 'STUDENT' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        email: true,
        phone: true,
        role: true,
      },
    });
  }

  async listContracts() {
    const storageRoot = this.getStorageRoot();

    if (!existsSync(storageRoot)) {
      return [];
    }

    const files = await this.walk(storageRoot);

    const contracts = await Promise.all(
      files
        .filter((file) => file.toLowerCase().endsWith('.txt'))
        .map(async (absolutePath) => {
          const fileStat = await stat(absolutePath);
          const relativePath = path
            .relative(storageRoot, absolutePath)
            .split(path.sep)
            .join('/');

          return {
            path: relativePath,
            fileName: path.basename(absolutePath),
            size: fileStat.size,
            updatedAt: fileStat.mtime,
          };
        }),
    );

    contracts.sort(
      (a, b) => Number(new Date(b.updatedAt)) - Number(new Date(a.updatedAt)),
    );
    return contracts;
  }

  async readContract(relativePath: string) {
    const absolutePath = this.resolveStoragePath(relativePath);

    if (!existsSync(absolutePath)) {
      throw new NotFoundException('Nie znaleziono pliku umowy.');
    }

    const content = await readFile(absolutePath, 'utf8');
    const fileStat = await stat(absolutePath);

    return {
      path: relativePath,
      fileName: path.basename(absolutePath),
      size: fileStat.size,
      updatedAt: fileStat.mtime,
      content,
    };
  }

  getContractAbsolutePath(relativePath: string) {
    const absolutePath = this.resolveStoragePath(relativePath);

    if (!existsSync(absolutePath)) {
      throw new NotFoundException('Nie znaleziono pliku umowy.');
    }

    return absolutePath;
  }

  private getStorageRoot() {
    const candidateA = path.resolve(process.cwd(), 'storage');
    const candidateB = path.resolve(process.cwd(), '..', '..', 'storage');

    if (existsSync(candidateA)) {
      return candidateA;
    }

    return candidateB;
  }

  private resolveStoragePath(relativePath: string) {
    const storageRoot = this.getStorageRoot();

    const safeRelativePath = String(relativePath).trim();
    if (!safeRelativePath) {
      throw new BadRequestException('Brak ścieżki pliku.');
    }

    const absolutePath = path.resolve(storageRoot, safeRelativePath);
    if (!absolutePath.startsWith(storageRoot)) {
      throw new BadRequestException('Nieprawidłowa ścieżka pliku.');
    }

    return absolutePath;
  }

  private async walk(dir: string): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true });
    const result: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        result.push(...(await this.walk(fullPath)));
      } else {
        result.push(fullPath);
      }
    }

    return result;
  }
}
