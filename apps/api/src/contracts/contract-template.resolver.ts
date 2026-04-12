import { Injectable, NotFoundException } from '@nestjs/common';
import { CourseMode, type Enrollment, type OfferItem } from '@prisma/client';
import * as path from 'path';

type EnrollmentWithOffer = Enrollment & {
  offerItem: OfferItem;
};

@Injectable()
export class ContractTemplateResolver {
  private readonly templatesDir = path.join(
    process.cwd(),
    'storage',
    'contract-templates',
  );

  resolveContractTemplate(enrollment: EnrollmentWithOffer): string {
    const code = enrollment.offerItem.code;
    const wantsInstallments = enrollment.wantsInstallments === true;

    const filename = this.resolveContractFilename(
      code,
      enrollment.courseMode,
      wantsInstallments,
    );

    return path.join(this.templatesDir, filename);
  }

  resolveRodoTemplate(enrollment: EnrollmentWithOffer): string {
    const isEnglish = enrollment.offerItem.language === 'EN';

    return path.join(
      this.templatesDir,
      isEnglish ? 'RODO Data Processing Agreement.pdf' : 'Zgoda RODO.pdf',
    );
  }

  private resolveContractFilename(
    offerItemCode: string,
    courseMode: CourseMode,
    wantsInstallments: boolean,
  ): string {
    const byCode: Record<string, { full: string; installments: string }> = {
      COURSE_B: {
        full:
          courseMode === 'ELEARNING'
            ? 'Umowa dla kursantów e-learning kat. B całość.pdf'
            : 'Umowa dla kursantów stacjonarny kat. B całość.pdf',
        installments:
          courseMode === 'ELEARNING'
            ? 'Umowa dla kursantów e-learning kat. B raty.pdf'
            : 'Umowa dla kursantów stacjonarny kat. B raty.pdf',
      },
      COURSE_B_AUT: {
        full:
          courseMode === 'ELEARNING'
            ? 'Umowa dla kursantów e-learning kat. B Automat CAŁOŚĆ.pdf'
            : 'Umowa dla kursantów stacjonarny kat. B Automat CAŁOŚĆ.pdf',
        installments:
          courseMode === 'ELEARNING'
            ? 'Umowa dla kursantów e-learning kat. B Automat RATY.pdf'
            : 'Umowa dla kursantów stacjonarny kat. B Automat RATY.pdf',
      },
      COURSE_B_NO_THEORY: {
        full: 'Umowa dla kursantów bez teorii kat. B całość.pdf',
        installments: 'Umowa dla kursantów bez teorii kat. B raty.pdf',
      },
      COURSE_B_AUT_NO_THEORY: {
        full: 'Umowa dla kursantów bez teorii kat. B Automat CAŁOŚĆ.pdf',
        installments: 'Umowa dla kursantów bez teorii kat. B Automat RATY.pdf',
      },
      COURSE_B_AFTER_B1: {
        full: 'Umowa dla kursantów kat. B po B1 CAŁOŚĆ.pdf',
        installments: 'Umowa dla kursantów kat. B po B1  RATY.pdf',
      },
      COURSE_B_AUT_AFTER_B1: {
        full: 'Umowa dla kursantów kat. B automat po B1 CAŁOŚĆ.pdf',
        installments: 'Umowa dla kursantów kat. B automat po B1 - RATY.pdf',
      },
      COURSE_B_INDIVIDUAL: {
        full: 'Umowa dla kursantów INDYWIDUALNY KAT. B CAŁOŚĆ.pdf',
        installments: 'Umowa dla kursantów INDYWIDUALNY KAT. B RATY.pdf',
      },
      COURSE_B_AUT_INDIVIDUAL: {
        full: 'Umowa dla kursantów INDYWIDUALNY KAT. B automat CAŁOŚĆ.pdf',
        installments:
          'Umowa dla kursantów INDYWIDUALNY KAT. B automat RATY.pdf',
      },
      COURSE_B_EN: {
        full: 'AGREEMENT B MANUAL FULL PAYMENT.pdf',
        installments: 'AGREEMENT B MANUAL INSTALLMENTS.pdf',
      },
      COURSE_B_AUT_EN: {
        full: 'AGREEMENT B AUTOMATIC FULL PAYMENT.pdf',
        installments: 'AGREEMENT B AUTOMATIC INSTALLMENTS.pdf',
      },
    };

    const match = byCode[offerItemCode];

    if (!match) {
      throw new NotFoundException(
        `Brak szablonu umowy dla oferty ${offerItemCode}.`,
      );
    }

    return wantsInstallments ? match.installments : match.full;
  }
}
