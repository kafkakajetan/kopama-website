import { Injectable } from '@nestjs/common';
import { copyFile, mkdir } from 'fs/promises';
import * as path from 'path';
import {
  CourseMode,
  OfferLanguage,
  type Enrollment,
  type OfferItem,
} from '@prisma/client';
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

@Injectable()
export class ContractPdfService {
  constructor(
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

    const contractFile = await this.copyTemplateToOutput({
      templateAbsolutePath: contractTemplatePath,
      outputDir: dir,
      outputFileName: `umowa-${input.fileId}.pdf`,
      storageRoot,
    });

    const rodoFile = await this.copyTemplateToOutput({
      templateAbsolutePath: rodoTemplatePath,
      outputDir: dir,
      outputFileName: `rodo-${input.fileId}.pdf`,
      storageRoot,
    });

    return {
      contract: contractFile,
      rodo: rodoFile,
    };
  }

  private async copyTemplateToOutput(params: {
    templateAbsolutePath: string;
    outputDir: string;
    outputFileName: string;
    storageRoot: string;
  }): Promise<GeneratedPdfFile> {
    const absolutePath = path.join(params.outputDir, params.outputFileName);

    await copyFile(params.templateAbsolutePath, absolutePath);

    return {
      fileName: params.outputFileName,
      absolutePath,
      relativePath: path
        .relative(params.storageRoot, absolutePath)
        .split(path.sep)
        .join('/'),
    };
  }

  private getStorageRoot() {
    const candidateA = path.resolve(process.cwd(), 'storage');
    const candidateB = path.resolve(process.cwd(), '..', '..', 'storage');
    return path.basename(candidateA) === 'storage' ? candidateA : candidateB;
  }
}
