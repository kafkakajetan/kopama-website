import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { SendMailOptions, Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import * as path from 'path';

type SendContractEmailParams = {
  to: string;
  fullName: string;
  contractAbsolutePath: string;
  rodoAbsolutePath?: string;
  loginEmail?: string;
  plainPassword?: string;
  isMinor?: boolean;
};

type SendNewStudentNotificationEmailParams = {
  fullName: string;
  phone: string;
  studentEmail: string;
  courseName: string;
  paymentSummary: string;
  courseModeLabel: string;
  courseStartDateLabel?: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

@Injectable()
export class MailService {
  constructor(private readonly config: ConfigService) {}

  private createTransporter(): Transporter<SMTPTransport.SentMessageInfo> {
    const host =
      this.config.get<string>('BREVO_SMTP_HOST') ??
      this.config.get<string>('SMTP_HOST') ??
      'smtp-relay.brevo.com';

    const port = Number(
      this.config.get<string>('BREVO_SMTP_PORT') ??
        this.config.get<string>('SMTP_PORT') ??
        587,
    );

    const secure =
      this.config.get<string>('BREVO_SMTP_SECURE') === 'true' ||
      this.config.get<string>('SMTP_SECURE') === 'true';

    const user =
      this.config.get<string>('BREVO_SMTP_LOGIN') ??
      this.config.get<string>('SMTP_USER');

    const pass =
      this.config.get<string>('BREVO_SMTP_KEY') ??
      this.config.get<string>('SMTP_PASS');

    const transportOptions: SMTPTransport.Options = {
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    };

    return nodemailer.createTransport(transportOptions);
  }

  private getSender() {
    const senderEmail =
      this.config.get<string>('BREVO_SENDER_EMAIL') ??
      this.config.get<string>('MAIL_FROM') ??
      this.config.get<string>('SMTP_USER') ??
      'no-reply@kopama.local';

    const senderName =
      this.config.get<string>('BREVO_SENDER_NAME') ?? 'OSK KopaMa';

    return {
      senderEmail,
      senderName,
      from: `"${senderName}" <${senderEmail}>`,
    };
  }

  private getPanelLoginUrl() {
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL')?.trim() ||
      'https://panelosk.cloud';

    return `${frontendUrl.replace(/\/$/, '')}/logowanie`;
  }

  async sendContractEmail(params: SendContractEmailParams): Promise<void> {
    const transporter = this.createTransporter();
    const { from, senderName } = this.getSender();

    const profileZaufanyUrl =
      this.config.get<string>('PROFILE_ZAUFANY_URL') ??
      'https://www.gov.pl/web/gov/podpisz-dokument-elektronicznie-wykorzystaj-podpis-zaufany';

    const panelLoginUrl = this.getPanelLoginUrl();

    const escapedFullName = escapeHtml(params.fullName);
    const escapedLoginEmail = params.loginEmail
      ? escapeHtml(params.loginEmail)
      : '';
    const escapedPassword = params.plainPassword
      ? escapeHtml(params.plainPassword)
      : '';

    const shellShadow = '0 28px 70px rgba(0,0,0,.21)';
    const cardShadow = '0 12px 28px rgba(15,23,42,.09)';

    const minorWarningText = params.isMinor
      ? [
          'WAŻNE:',
          'Ponieważ kursant jest osobą niepełnoletnią, na umowie oraz dokumencie RODO muszą znaleźć się podpisy zarówno kursanta, jak i opiekuna prawnego.',
        ].join('\n')
      : '';

    const minorWarningHtml = params.isMinor
      ? `
        <tr>
          <td style="padding:0 0 20px 0;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#fff5f5" style="border-collapse:collapse; border:1px solid #dc2626; border-radius:14px; background:#fff5f5; box-shadow:${cardShadow};">
              <tr>
                <td style="padding:16px 18px; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:21px; color:#991b1b;">
                  <strong style="display:block; margin-bottom:8px;">Ważna informacja dla osoby niepełnoletniej</strong>
                  Na umowie oraz dokumencie RODO muszą znaleźć się podpisy zarówno kursanta, jak i opiekuna prawnego.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `
      : '';

    const loginBlockText =
      params.loginEmail && params.plainPassword
        ? [
            'Dane do logowania do panelu kursanta:',
            `Email: ${params.loginEmail}`,
            `Hasło: ${params.plainPassword}`,
          ].join('\n')
        : '';

    const loginBlockHtml =
      params.loginEmail && params.plainPassword
        ? `
          <tr>
            <td style="padding:0 0 20px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="border-collapse:collapse; border:1px solid #d6d9e0; border-radius:14px; background:#ffffff; box-shadow:${cardShadow};">
                <tr>
                  <td style="padding:16px 18px; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:21px; color:#1f2937;">
                    <strong style="display:block; margin-bottom:8px;">Dane do logowania do panelu kursanta</strong>
                    <div>Email: ${escapedLoginEmail}</div>
                    <div>Hasło: ${escapedPassword}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        `
        : '';

    const panelButtonHtml = `
      <tr>
        <td style="padding:0 0 20px 0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="border-collapse:collapse; border-radius:14px; background:#ffffff; box-shadow:${cardShadow};">
            <tr>
              <td align="center" style="padding:20px 18px;">
                <a href="${panelLoginUrl}" style="display:inline-block; background:#081f44; color:#ffffff; text-decoration:none; font-family:Arial, Helvetica, sans-serif; font-size:15px; font-weight:700; padding:14px 24px; border-radius:14px;">
                  Zaloguj do Panelu Kursanta
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;

    const textParts = [
      `Dzień dobry ${params.fullName},`,
      'w załączniku przesyłamy dokumenty do podpisu.',
      'Załączniki:',
      '- umowa PDF',
      params.rodoAbsolutePath ? '- dokument RODO PDF' : null,
      minorWarningText || null,
      'Dokumenty możesz podpisać elektronicznie przy użyciu Profilu Zaufanego:',
      profileZaufanyUrl,
      loginBlockText || null,
      `Panel kursanta: ${panelLoginUrl}`,
      'Po podpisaniu dokumentów zachowaj je zgodnie z dalszymi instrukcjami szkoły.',
      'Pozdrawiamy,',
      senderName,
    ].filter(Boolean);

    const attachments: NonNullable<SendMailOptions['attachments']> = [
      {
        filename: path.basename(params.contractAbsolutePath),
        path: params.contractAbsolutePath,
        contentType: 'application/pdf',
      },
    ];

    if (params.rodoAbsolutePath) {
      attachments.push({
        filename: path.basename(params.rodoAbsolutePath),
        path: params.rodoAbsolutePath,
        contentType: 'application/pdf',
      });
    }

    const mailOptions: SendMailOptions = {
      from,
      to: params.to,
      subject: 'OSK KopaMa – dokumenty do podpisu',
      text: textParts.join('\n\n'),
      html: `
        <!doctype html>
        <html lang="pl">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <meta name="color-scheme" content="light only" />
            <meta name="supported-color-schemes" content="light only" />
            <title>OSK KopaMa – dokumenty do podpisu</title>
            <style>
              :root { color-scheme: light only !important; }
              body, table, td, div, p, a {
                font-family: Arial, Helvetica, sans-serif !important;
              }
            </style>
          </head>
          <body bgcolor="#0b3bb3" style="margin:0; padding:0; background:#0b3bb3;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#0b3bb3" style="border-collapse:collapse; background:#0b3bb3; margin:0; padding:0;">
              <tr>
                <td align="center" style="padding:32px 16px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f3f4f6" style="border-collapse:collapse; max-width:680px; background:#f3f4f6; border-radius:24px; overflow:hidden; box-shadow:${shellShadow};">
                    <tr>
                      <td bgcolor="#0b3bb3" style="padding:36px 32px 28px 32px; background:#0b3bb3; text-align:center;">
                        <div style="font-size:13px; line-height:20px; color:#ffffff; font-weight:700; margin-bottom:10px;">
                          Zakup kursu online
                        </div>
                        <div style="font-size:36px; line-height:42px; color:#ffffff; font-weight:800; margin-bottom:10px;">
                          Dokumenty do podpisu
                        </div>
                        <div style="font-size:16px; line-height:24px; color:#f4e3c3;">
                          OSK KopaMa
                        </div>
                      </td>
                    </tr>

                    <tr>
                      <td bgcolor="#f3f4f6" style="padding:30px 28px 32px 28px; background:#f3f4f6;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                          <tr>
                            <td style="padding:0 0 20px 0; font-size:15px; line-height:24px; color:#1f2937;">
                              Dzień dobry <strong>${escapedFullName}</strong>,
                              <br /><br />
                              w załączniku przesyłamy dokumenty do podpisu związane z zapisem na kurs.
                            </td>
                          </tr>

                          ${minorWarningHtml}

                          <tr>
                            <td style="padding:0 0 20px 0;">
                              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="border-collapse:collapse; border:1px solid #d6d9e0; border-radius:14px; background:#ffffff; box-shadow:${cardShadow};">
                                <tr>
                                  <td style="padding:16px 18px; font-size:14px; line-height:22px; color:#1f2937;">
                                    <strong style="display:block; margin-bottom:8px;">Załączniki</strong>
                                    <div>1. Umowa w formacie PDF</div>
                                    ${
                                      params.rodoAbsolutePath
                                        ? '<div>2. Dokument RODO w formacie PDF</div>'
                                        : ''
                                    }
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>

                          <tr>
                            <td style="padding:0 0 20px 0;">
                              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="border-collapse:collapse; border:1px solid #d6d9e0; border-radius:14px; background:#ffffff; box-shadow:${cardShadow};">
                                <tr>
                                  <td style="padding:16px 18px; font-size:14px; line-height:22px; color:#1f2937;">
                                    <strong style="display:block; margin-bottom:8px;">Podpis elektroniczny</strong>
                                    Dokumenty możesz podpisać elektronicznie przy użyciu Profilu Zaufanego.
                                    <br /><br />
                                    <a href="${profileZaufanyUrl}" style="color:#0b3bb3; font-weight:700; text-decoration:none;">
                                      Przejdź do Profilu Zaufanego
                                    </a>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>

                          ${loginBlockHtml}
                          ${panelButtonHtml}

                          <tr>
                            <td style="padding:0; font-size:14px; line-height:22px; color:#4b5563;">
                              Po podpisaniu dokumentów zachowaj je zgodnie z dalszymi instrukcjami szkoły.
                              <br /><br />
                              Pozdrawiamy,
                              <br />
                              <strong style="color:#111827;">${escapeHtml(senderName)}</strong>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
      attachments,
    };

    await transporter.sendMail(mailOptions);
  }

  async sendNewStudentNotificationEmail(
    params: SendNewStudentNotificationEmailParams,
  ): Promise<void> {
    const to = this.config.get<string>('NEW_STUDENT_NOTIFY_EMAIL')?.trim();
    if (!to) return;

    const transporter = this.createTransporter();
    const { from, senderName } = this.getSender();

    const escapedFullName = escapeHtml(params.fullName);
    const escapedPhone = escapeHtml(params.phone);
    const escapedStudentEmail = escapeHtml(params.studentEmail);
    const escapedCourseName = escapeHtml(params.courseName);
    const escapedPaymentSummary = escapeHtml(params.paymentSummary);
    const escapedCourseModeLabel = escapeHtml(params.courseModeLabel);
    const escapedCourseStartDateLabel = params.courseStartDateLabel
      ? escapeHtml(params.courseStartDateLabel)
      : '';

    const shellShadow = '0 28px 70px rgba(0,0,0,.21)';
    const cardShadow = '0 12px 28px rgba(15,23,42,.09)';

    const text = [
      'Nowy kursant w systemie.',
      '',
      `Imię i nazwisko: ${params.fullName}`,
      `Telefon: ${params.phone}`,
      `Email kursanta: ${params.studentEmail}`,
      `Kurs: ${params.courseName}`,
      `Tryb kursu: ${params.courseModeLabel}`,
      params.courseStartDateLabel
        ? `Termin rozpoczęcia kursu: ${params.courseStartDateLabel}`
        : null,
      `Sposób płatności: ${params.paymentSummary}`,
    ]
      .filter(Boolean)
      .join('\n');

    const mailOptions: SendMailOptions = {
      from,
      to,
      subject: 'OSK KopaMa – nowy kursant',
      text,
      html: `
        <!doctype html>
        <html lang="pl">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <meta name="color-scheme" content="light only" />
            <meta name="supported-color-schemes" content="light only" />
            <title>OSK KopaMa – nowy kursant</title>
            <style>
              :root { color-scheme: light only !important; }
              body, table, td, div, p, a {
                font-family: Arial, Helvetica, sans-serif !important;
              }
            </style>
          </head>
          <body bgcolor="#0b3bb3" style="margin:0; padding:0; background:#0b3bb3;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#0b3bb3" style="border-collapse:collapse; background:#0b3bb3;">
              <tr>
                <td align="center" style="padding:32px 16px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f3f4f6" style="border-collapse:collapse; max-width:680px; background:#f3f4f6; border-radius:24px; overflow:hidden; box-shadow:${shellShadow};">
                    <tr>
                      <td bgcolor="#0b3bb3" style="padding:32px 28px; background:#0b3bb3; text-align:center;">
                        <div style="font-size:13px; line-height:20px; color:#ffffff; font-weight:700; margin-bottom:10px;">
                          Powiadomienie systemowe
                        </div>
                        <div style="font-size:32px; line-height:38px; color:#ffffff; font-weight:800; margin-bottom:8px;">
                          Nowy kursant
                        </div>
                        <div style="font-size:16px; line-height:24px; color:#f4e3c3;">
                          ${escapeHtml(senderName)}
                        </div>
                      </td>
                    </tr>

                    <tr>
                      <td bgcolor="#f3f4f6" style="padding:28px; background:#f3f4f6;">
                        <div style="font-size:15px; line-height:24px; color:#1f2937; margin-bottom:18px;">
                          Do systemu został dodany nowy kursant. Najważniejsze dane:
                        </div>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:separate; border-spacing:0 12px;">
                          <tr>
                            <td bgcolor="#ffffff" style="padding:16px 18px; background:#ffffff; border:1px solid #d6d9e0; border-radius:14px; box-shadow:${cardShadow}; color:#111827;">
                              <div style="font-size:13px; color:#6b7280; margin-bottom:4px;">Imię i nazwisko</div>
                              <div style="font-size:24px; font-weight:800;">${escapedFullName}</div>
                            </td>
                          </tr>
                          <tr>
                            <td bgcolor="#ffffff" style="padding:16px 18px; background:#ffffff; border:1px solid #d6d9e0; border-radius:14px; box-shadow:${cardShadow}; color:#111827;">
                              <div style="font-size:13px; color:#6b7280; margin-bottom:4px;">Telefon</div>
                              <div style="font-size:20px; font-weight:700;">${escapedPhone}</div>
                            </td>
                          </tr>
                          <tr>
                            <td bgcolor="#ffffff" style="padding:16px 18px; background:#ffffff; border:1px solid #d6d9e0; border-radius:14px; box-shadow:${cardShadow}; color:#111827;">
                              <div style="font-size:13px; color:#6b7280; margin-bottom:4px;">Email kursanta</div>
                              <div style="font-size:20px; font-weight:700;">${escapedStudentEmail}</div>
                            </td>
                          </tr>
                          <tr>
                            <td bgcolor="#ffffff" style="padding:16px 18px; background:#ffffff; border:1px solid #d6d9e0; border-radius:14px; box-shadow:${cardShadow}; color:#111827;">
                              <div style="font-size:13px; color:#6b7280; margin-bottom:4px;">Kurs</div>
                              <div style="font-size:20px; font-weight:700;">${escapedCourseName}</div>
                            </td>
                          </tr>
                          <tr>
                            <td bgcolor="#ffffff" style="padding:16px 18px; background:#ffffff; border:1px solid #d6d9e0; border-radius:14px; box-shadow:${cardShadow}; color:#111827;">
                              <div style="font-size:13px; color:#6b7280; margin-bottom:4px;">Tryb kursu</div>
                              <div style="font-size:20px; font-weight:700;">${escapedCourseModeLabel}</div>
                            </td>
                          </tr>
                          ${
                            params.courseStartDateLabel
                              ? `
                                                    <tr>
                                                      <td bgcolor="#ffffff" style="padding:16px 18px; background:#ffffff; border:1px solid #d6d9e0; border-radius:14px; box-shadow:${cardShadow}; color:#111827;">
                                                        <div style="font-size:13px; color:#6b7280; margin-bottom:4px;">Termin rozpoczęcia kursu</div>
                                                        <div style="font-size:20px; font-weight:700;">${escapedCourseStartDateLabel}</div>
                                                      </td>
                                                    </tr>
                                                  `
                              : ''
                          }
                          <tr>
                            <td bgcolor="#eef4ff" style="padding:16px 18px; background:#eef4ff; border:1px solid #9db7ff; border-radius:14px; box-shadow:${cardShadow}; color:#0f172a;">
                              <div style="font-size:13px; color:#4b5563; margin-bottom:4px;">Sposób płatności</div>
                              <div style="font-size:22px; font-weight:800;">${escapedPaymentSummary}</div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
  }
}
