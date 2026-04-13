import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, writeFile } from 'fs/promises';
import * as path from 'path';
import {
  CourseMode,
  OfferLanguage,
  type Enrollment,
  type OfferItem,
} from '@prisma/client';
import { PDFDocument, type PDFFont, type PDFPage, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { ContractTemplateResolver } from './contract-template.resolver';

export type GeneratedPdfFile = {
  fileName: string;
  absolutePath: string;
  relativePath: string;
};

export type EnrollmentDocumentsInput = {
  fileId: string;
  offerItemCode: string;
  offerLanguage: OfferLanguage;
  courseMode: CourseMode;
  wantsInstallments: boolean;
  firstName: string;
  lastName: string;
  pesel: string;
  pkkNumber?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  postalCode: string;
  phone: string;
  email: string;
  otherDrivingLicenseCategory?: string | null;
  otherDrivingLicenseNumber?: string | null;
  hasTramPermit?: boolean;
  tramPermitNumber?: string | null;
  generatedAt?: Date;
};

export type EnrollmentDocumentsResult = {
  contract: GeneratedPdfFile;
  rodo: GeneratedPdfFile;
};

type ResolverEnrollment = Pick<
  Enrollment,
  'courseMode' | 'wantsInstallments'
> & {
  offerItem: Pick<OfferItem, 'code' | 'language'>;
};

type TextPlacement = {
  pageIndex: number;
  x: number;
  y: number;
  size: number;
  maxWidth?: number;
};

type ContractLayout = {
  cityAndDate: TextPlacement;
  fullName: TextPlacement;
  pesel: TextPlacement;
  address: TextPlacement;
  pkkNumber: TextPlacement;
  phone: TextPlacement;
  email: TextPlacement;
  drivingCategory: TextPlacement;
  drivingNumber: TextPlacement;
  tramPermitNumber: TextPlacement;
};

type RodoLayout = {
  cityAndDate: TextPlacement;
  fullName: TextPlacement;
  pesel: TextPlacement;
};

@Injectable()
export class ContractPdfService {
  constructor(
    private readonly config: ConfigService,
    private readonly contractTemplateResolver: ContractTemplateResolver,
  ) {}

  async generateEnrollmentDocuments(
    input: EnrollmentDocumentsInput,
  ): Promise<EnrollmentDocumentsResult> {
    const generatedAt = input.generatedAt ?? new Date();

    const resolverEnrollment: ResolverEnrollment = {
      courseMode: input.courseMode,
      wantsInstallments: input.wantsInstallments,
      offerItem: {
        code: input.offerItemCode,
        language: input.offerLanguage,
      },
    };

    const contractTemplatePath =
      this.contractTemplateResolver.resolveContractTemplate(
        resolverEnrollment as Enrollment & { offerItem: OfferItem },
      );

    const rodoTemplatePath = this.contractTemplateResolver.resolveRodoTemplate(
      resolverEnrollment as Enrollment & { offerItem: OfferItem },
    );

    const storageRoot = this.getStorageRoot();
    const year = String(generatedAt.getFullYear());
    const month = String(generatedAt.getMonth() + 1).padStart(2, '0');
    const dir = path.join(storageRoot, 'contracts', year, month);

    await mkdir(dir, { recursive: true });

    const contractAbsolutePath = path.join(dir, `umowa-${input.fileId}.pdf`);
    const rodoAbsolutePath = path.join(dir, `rodo-${input.fileId}.pdf`);

    await this.personalizeContractPdf({
      templateAbsolutePath: contractTemplatePath,
      outputAbsolutePath: contractAbsolutePath,
      input,
      generatedAt,
    });

    await this.personalizeRodoPdf({
      templateAbsolutePath: rodoTemplatePath,
      outputAbsolutePath: rodoAbsolutePath,
      input,
      generatedAt,
    });

    return {
      contract: {
        fileName: path.basename(contractAbsolutePath),
        absolutePath: contractAbsolutePath,
        relativePath: path
          .relative(storageRoot, contractAbsolutePath)
          .split(path.sep)
          .join('/'),
      },
      rodo: {
        fileName: path.basename(rodoAbsolutePath),
        absolutePath: rodoAbsolutePath,
        relativePath: path
          .relative(storageRoot, rodoAbsolutePath)
          .split(path.sep)
          .join('/'),
      },
    };
  }

  private async personalizeContractPdf(params: {
    templateAbsolutePath: string;
    outputAbsolutePath: string;
    input: EnrollmentDocumentsInput;
    generatedAt: Date;
  }) {
    const templateBytes = await readFile(params.templateAbsolutePath);
    const pdfDoc = await PDFDocument.load(templateBytes);

    pdfDoc.registerFontkit(fontkit);
    const font = await pdfDoc.embedFont(await this.readFontBytes());

    const pages = pdfDoc.getPages();
    if (pages.length === 0) {
      throw new InternalServerErrorException(
        'Szablon umowy nie zawiera żadnej strony.',
      );
    }

    const page = pages[0];
    const layout = this.getContractLayout();

    const fullName = this.normalizeText(
      `${params.input.firstName} ${params.input.lastName}`,
    );
    const address = this.normalizeText(
      [
        params.input.addressLine1,
        params.input.addressLine2,
        `${params.input.postalCode} ${params.input.city}`,
      ]
        .filter(Boolean)
        .join(', '),
    );

    const cityAndDate = this.normalizeText(
      `${this.getContractPlace()}, ${this.formatDate(params.generatedAt)}`,
    );

    const drivingCategory = this.normalizeText(
      params.input.otherDrivingLicenseCategory ?? '',
    );
    const drivingNumber = this.normalizeText(
      params.input.otherDrivingLicenseNumber ?? '',
    );
    const tramPermitNumber =
      params.input.hasTramPermit === true
        ? this.normalizeText(params.input.tramPermitNumber ?? '')
        : '';

    this.drawField(page, font, cityAndDate, layout.cityAndDate);
    this.drawField(page, font, fullName, layout.fullName);
    this.drawField(
      page,
      font,
      this.normalizeText(params.input.pesel),
      layout.pesel,
    );
    this.drawField(page, font, address, layout.address);
    this.drawField(
      page,
      font,
      this.normalizeText(params.input.pkkNumber ?? ''),
      layout.pkkNumber,
    );
    this.drawField(
      page,
      font,
      this.normalizeText(params.input.phone),
      layout.phone,
    );
    this.drawField(
      page,
      font,
      this.normalizeText(params.input.email),
      layout.email,
    );
    this.drawField(page, font, drivingCategory, layout.drivingCategory);
    this.drawField(page, font, drivingNumber, layout.drivingNumber);
    this.drawField(page, font, tramPermitNumber, layout.tramPermitNumber);

    const pdfBytes = await pdfDoc.save();
    await writeFile(params.outputAbsolutePath, pdfBytes);
  }

  private async personalizeRodoPdf(params: {
    templateAbsolutePath: string;
    outputAbsolutePath: string;
    input: EnrollmentDocumentsInput;
    generatedAt: Date;
  }) {
    const templateBytes = await readFile(params.templateAbsolutePath);
    const pdfDoc = await PDFDocument.load(templateBytes);

    pdfDoc.registerFontkit(fontkit);
    const font = await pdfDoc.embedFont(await this.readFontBytes());

    const pages = pdfDoc.getPages();
    if (pages.length === 0) {
      throw new InternalServerErrorException(
        'Szablon RODO nie zawiera żadnej strony.',
      );
    }

    const page = pages[0];
    const layout = this.getRodoLayout();

    const fullName = this.normalizeText(
      `${params.input.firstName} ${params.input.lastName}`,
    );
    const cityAndDate = this.normalizeText(
      `${this.getContractPlace()}, ${this.formatDate(params.generatedAt)}`,
    );

    this.drawField(page, font, cityAndDate, layout.cityAndDate);
    this.drawField(page, font, fullName, layout.fullName);
    this.drawField(
      page,
      font,
      this.normalizeText(params.input.pesel),
      layout.pesel,
    );

    const pdfBytes = await pdfDoc.save();
    await writeFile(params.outputAbsolutePath, pdfBytes);
  }

  private drawField(
    page: PDFPage,
    font: PDFFont,
    value: string,
    placement: TextPlacement,
  ) {
    const text = this.normalizeText(value);
    if (!text) return;

    const fitted = this.fitTextToWidth(
      font,
      text,
      placement.size,
      placement.maxWidth,
    );

    const textWidth = font.widthOfTextAtSize(fitted.text, fitted.size);
    const backgroundWidth = placement.maxWidth
      ? Math.min(textWidth, placement.maxWidth)
      : textWidth;

    page.drawRectangle({
      x: placement.x - 2,
      y: placement.y - 2,
      width: backgroundWidth + 4,
      height: fitted.size + 5,
      color: rgb(1, 1, 1),
    });

    page.drawText(fitted.text, {
      x: placement.x,
      y: placement.y,
      size: fitted.size,
      font,
      color: rgb(0, 0, 0),
    });
  }

  private fitTextToWidth(
    font: PDFFont,
    text: string,
    baseSize: number,
    maxWidth?: number,
  ): { text: string; size: number } {
    if (!maxWidth) {
      return { text, size: baseSize };
    }

    let currentSize = baseSize;
    let currentText = text;

    while (
      currentSize > 6 &&
      font.widthOfTextAtSize(currentText, currentSize) > maxWidth
    ) {
      currentSize -= 0.25;
    }

    while (
      font.widthOfTextAtSize(currentText, currentSize) > maxWidth &&
      currentText.length > 4
    ) {
      currentText = `${currentText.slice(0, -2).trimEnd()}...`;
    }

    return {
      text: currentText,
      size: currentSize,
    };
  }

  private getContractLayout(): ContractLayout {
    return {
      cityAndDate: {
        pageIndex: 0,
        x: 418,
        y: 804,
        size: 10,
        maxWidth: 145,
      },
      fullName: {
        pageIndex: 0,
        x: 154,
        y: 658,
        size: 10,
        maxWidth: 250,
      },
      pesel: {
        pageIndex: 0,
        x: 484,
        y: 654,
        size: 10,
        maxWidth: 88,
      },
      address: {
        pageIndex: 0,
        x: 88,
        y: 631,
        size: 10,
        maxWidth: 470,
      },
      pkkNumber: {
        pageIndex: 0,
        x: 88,
        y: 610,
        size: 10,
        maxWidth: 230,
      },
      phone: {
        pageIndex: 0,
        x: 456,
        y: 611,
        size: 10,
        maxWidth: 110,
      },
      email: {
        pageIndex: 0,
        x: 131,
        y: 587,
        size: 10,
        maxWidth: 210,
      },
      drivingCategory: {
        pageIndex: 0,
        x: 87,
        y: 556,
        size: 10,
        maxWidth: 70,
      },
      drivingNumber: {
        pageIndex: 0,
        x: 252,
        y: 556,
        size: 10,
        maxWidth: 170,
      },
      tramPermitNumber: {
        pageIndex: 0,
        x: 252,
        y: 556,
        size: 10,
        maxWidth: 170,
      },
    };
  }

  private getRodoLayout(): RodoLayout {
    return {
      cityAndDate: {
        pageIndex: 0,
        x: 92,
        y: 804,
        size: 10,
        maxWidth: 180,
      },
      fullName: {
        pageIndex: 0,
        x: 304,
        y: 662,
        size: 10,
        maxWidth: 250,
      },
      pesel: {
        pageIndex: 0,
        x: 422,
        y: 639,
        size: 10,
        maxWidth: 180,
      },
    };
  }

  private formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());
    return `${day}.${month}.${year}`;
  }

  private normalizeText(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }

  private getContractPlace(): string {
    return this.config.get<string>('CONTRACT_PLACE')?.trim() || 'Wrocław';
  }

  private async readFontBytes(): Promise<Uint8Array> {
    const configured = this.config.get<string>('PDF_FONT_PATH');

    const candidates = [
      configured ? path.resolve(process.cwd(), configured) : null,
      path.resolve(process.cwd(), 'assets', 'fonts', 'arial.ttf'),
      '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
      '/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf',
    ].filter((value): value is string => Boolean(value));

    for (const candidate of candidates) {
      try {
        return await readFile(candidate);
      } catch {
        continue;
      }
    }

    throw new InternalServerErrorException(
      'Nie znaleziono czcionki do generowania PDF. Ustaw PDF_FONT_PATH albo dodaj plik assets/fonts/arial.ttf.',
    );
  }

  private getStorageRoot() {
    const candidateA = path.resolve(process.cwd(), 'storage');
    const candidateB = path.resolve(process.cwd(), '..', '..', 'storage');
    return path.basename(candidateA) === 'storage' ? candidateA : candidateB;
  }
}
