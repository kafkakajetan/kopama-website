import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, writeFile } from 'fs/promises';
import * as path from 'path';
import { PDFDocument, PageSizes, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

export type TestContractPdfInput = {
  fileId: string;
  fullName: string;
  email: string;
  phone: string;
  pesel: string;
  address: string;
  courseName: string;
  generatedAt?: Date;
};

@Injectable()
export class ContractPdfService {
  constructor(private readonly config: ConfigService) {}

  async generateTestContractPdf(input: TestContractPdfInput) {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    const fontPath = this.getFontPath();
    const fontBytes = await readFile(fontPath);
    const font = await pdfDoc.embedFont(fontBytes);

    const page = pdfDoc.addPage(PageSizes.A4);
    const { height } = page.getSize();

    page.drawText('KopaMa – umowa testowa', {
      x: 50,
      y: height - 60,
      size: 20,
      font,
      color: rgb(0, 0, 0),
    });

    const generatedAt = input.generatedAt ?? new Date();

    const lines = [
      'Dokument testowy – do podmiany na finalny wzór.',
      '',
      `Data wygenerowania: ${generatedAt.toLocaleString('pl-PL')}`,
      '',
      `Imię i nazwisko: ${input.fullName}`,
      `Email: ${input.email}`,
      `Telefon: ${input.phone}`,
      `PESEL: ${input.pesel}`,
      `Adres: ${input.address}`,
      `Kurs: ${input.courseName}`,
      '',
      'Oświadczenie:',
      'Kursant potwierdza chęć zawarcia umowy na realizację szkolenia.',
      'To jest wersja testowa PDF przygotowana do wdrożenia dalszego obiegu.',
    ];

    let y = height - 110;
    for (const line of lines) {
      page.drawText(line, {
        x: 50,
        y,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
      y -= 18;
    }

    const storageRoot = this.getStorageRoot();
    const year = String(generatedAt.getFullYear());
    const month = String(generatedAt.getMonth() + 1).padStart(2, '0');

    const dir = path.join(storageRoot, 'contracts', year, month);
    await mkdir(dir, { recursive: true });

    const fileName = `umowa-testowa-${input.fileId}.pdf`;
    const absolutePath = path.join(dir, fileName);

    const pdfBytes = await pdfDoc.save();
    await writeFile(absolutePath, pdfBytes);

    return {
      fileName,
      absolutePath,
      relativePath: path
        .relative(storageRoot, absolutePath)
        .split(path.sep)
        .join('/'),
    };
  }

  private getStorageRoot() {
    const candidateA = path.resolve(process.cwd(), 'storage');
    const candidateB = path.resolve(process.cwd(), '..', '..', 'storage');
    return path.basename(candidateA) === 'storage' ? candidateA : candidateB;
  }

  private getFontPath() {
    const configured = this.config.get<string>('PDF_FONT_PATH');
    if (configured) {
      return path.resolve(process.cwd(), configured);
    }

    return path.resolve(process.cwd(), 'assets', 'fonts', 'arial.ttf');
  }
}
