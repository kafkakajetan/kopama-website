import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtCookieGuard } from '../auth/jwt-cookie.guard';
import { ContractsService } from './contracts.service';
import { AdminGuard } from '../auth/admin.guard';

type ReqWithUser = Request & {
  user: { id: string; role: string; email: string };
};

@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}
  @Get(':enrollmentId/test-file')
  async getTestFile(
    @Param('enrollmentId') enrollmentId: string,
    @Res() res: Response,
  ) {
    const contractKey = `contract_${enrollmentId}.txt`;
    const filePath = path.join(
      process.cwd(),
      'storage',
      'contracts',
      contractKey,
    );

    try {
      await fs.access(filePath);
    } catch {
      throw new NotFoundException('Nie znaleziono pliku umowy.');
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.sendFile(filePath);
  }

  @Post('enrollments/:enrollmentId/upload')
  @UseGuards(JwtCookieGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 15 * 1024 * 1024,
      },
      fileFilter: (_req, file, cb) => {
        const isPdf =
          String(file.originalname ?? '')
            .toLowerCase()
            .endsWith('.pdf') &&
          String(file.mimetype ?? '').toLowerCase() === 'application/pdf';

        if (!isPdf) {
          return cb(
            new BadRequestException('Dozwolone są wyłącznie pliki PDF.'),
            false,
          );
        }

        cb(null, true);
      },
    }),
  )
  uploadStudentContract(
    @Param('enrollmentId') enrollmentId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: ReqWithUser,
  ) {
    return this.contractsService.uploadStudentContract({
      enrollmentId,
      userId: req.user.id,
      file,
    });
  }

  @Post('admin/enrollments/:enrollmentId/upload')
  @UseGuards(JwtCookieGuard, AdminGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 15 * 1024 * 1024,
      },
      fileFilter: (_req, file, cb) => {
        const isPdf =
          String(file.originalname ?? '')
            .toLowerCase()
            .endsWith('.pdf') &&
          String(file.mimetype ?? '').toLowerCase() === 'application/pdf';

        if (!isPdf) {
          return cb(
            new BadRequestException('Dozwolone są wyłącznie pliki PDF.'),
            false,
          );
        }

        cb(null, true);
      },
    }),
  )
  uploadAdminContract(
    @Param('enrollmentId') enrollmentId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: ReqWithUser,
  ) {
    return this.contractsService.uploadAdminContract({
      enrollmentId,
      userId: req.user.id,
      file,
    });
  }
}
