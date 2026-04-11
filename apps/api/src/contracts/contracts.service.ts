import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { mkdir, stat, writeFile } from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  async uploadStudentContract(params: {
    enrollmentId: string;
    userId: string;
    file: Express.Multer.File;
  }) {
    const { enrollmentId, userId, file } = params;

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Nie znaleziono zapisu.');
    }

    if (!enrollment.userId || enrollment.userId !== userId) {
      throw new ForbiddenException('Nie możesz dodać umowy do tego zapisu.');
    }

    if (!file) {
      throw new BadRequestException('Nie wybrano pliku.');
    }

    const originalName = String(file.originalname ?? '').trim();
    const mimeType = String(file.mimetype ?? '')
      .trim()
      .toLowerCase();

    if (!originalName.toLowerCase().endsWith('.pdf')) {
      throw new BadRequestException('Dozwolone są wyłącznie pliki PDF.');
    }

    if (mimeType && mimeType !== 'application/pdf') {
      throw new BadRequestException('Dozwolone są wyłącznie pliki PDF.');
    }

    const storageRoot = this.getStorageRoot();
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const dir = path.join(storageRoot, 'uploaded-contracts', year, month);
    await mkdir(dir, { recursive: true });

    const safeBaseName = originalName
      .replace(/\.pdf$/i, '')
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);

    const fileName = `${enrollmentId}_${randomUUID()}_${safeBaseName || 'umowa'}.pdf`;
    const absolutePath = path.join(dir, fileName);

    await writeFile(absolutePath, file.buffer);

    const fileStats = await stat(absolutePath);
    const relativePath = path
      .relative(storageRoot, absolutePath)
      .split(path.sep)
      .join('/');

    const created = await this.prisma.uploadedContract.create({
      data: {
        enrollmentId,
        uploadedByUserId: userId,
        source: 'STUDENT',
        originalFileName: originalName,
        storageKey: relativePath,
        mimeType: 'application/pdf',
        sizeBytes: fileStats.size,
      },
      select: {
        id: true,
        enrollmentId: true,
        source: true,
        originalFileName: true,
        storageKey: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
      },
    });

    return created;
  }

  private getStorageRoot() {
    const candidateA = path.resolve(process.cwd(), 'storage');
    const candidateB = path.resolve(process.cwd(), '..', '..', 'storage');
    return path.basename(candidateA) === 'storage' ? candidateA : candidateB;
  }
}
