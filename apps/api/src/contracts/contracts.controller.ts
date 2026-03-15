import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';

@Controller('contracts')
export class ContractsController {
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
}
