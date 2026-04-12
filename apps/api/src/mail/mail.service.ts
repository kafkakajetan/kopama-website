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

  async sendContractEmail(params: SendContractEmailParams): Promise<void> {
    const transporter = this.createTransporter();

    const senderEmail =
      this.config.get<string>('BREVO_SENDER_EMAIL') ??
      this.config.get<string>('MAIL_FROM') ??
      this.config.get<string>('SMTP_USER') ??
      'no-reply@kopama.local';

    const senderName =
      this.config.get<string>('BREVO_SENDER_NAME') ?? 'OSK KopaMa';

    const from = `"${senderName}" <${senderEmail}>`;

    const profileZaufanyUrl =
      this.config.get<string>('PROFILE_ZAUFANY_URL') ??
      'https://www.gov.pl/web/gov/podpisz-dokument-elektronicznie-wykorzystaj-podpis-zaufany';

    const escapedFullName = escapeHtml(params.fullName);
    const escapedLoginEmail = params.loginEmail
      ? escapeHtml(params.loginEmail)
      : '';
    const escapedPassword = params.plainPassword
      ? escapeHtml(params.plainPassword)
      : '';

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
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse; border:1px solid #dc2626; border-radius:14px; background:#fff5f5;">
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
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse; border:1px solid #d6d9e0; border-radius:14px; background:#ffffff;">
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
            <title>OSK KopaMa – dokumenty do podpisu</title>
          </head>
          <body style="margin:0; padding:0; background:#0b3bb3;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse; background:#0b3bb3; margin:0; padding:0;">
              <tr>
                <td align="center" style="padding:32px 16px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse; max-width:680px; background:#f3f4f6; border-radius:24px; overflow:hidden;">
                    <tr>
                      <td style="padding:36px 32px 28px 32px; background:#0b3bb3; text-align:center;">
                        <div style="font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:20px; color:#ffffff; font-weight:700; margin-bottom:10px;">
                          Zakup kursu online
                        </div>
                        <div style="font-family:Arial, Helvetica, sans-serif; font-size:36px; line-height:42px; color:#ffffff; font-weight:800; margin-bottom:10px;">
                          Dokumenty do podpisu
                        </div>
                        <div style="font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:24px; color:#f4e3c3;">
                          OSK KopaMa
                        </div>
                      </td>
                    </tr>

                    <tr>
                      <td style="padding:30px 28px 32px 28px;">
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                          <tr>
                            <td style="padding:0 0 20px 0; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:24px; color:#1f2937;">
                              Dzień dobry <strong>${escapedFullName}</strong>,
                              <br /><br />
                              w załączniku przesyłamy dokumenty do podpisu związane z zapisem na kurs.
                            </td>
                          </tr>

                          ${minorWarningHtml}

                          <tr>
                            <td style="padding:0 0 20px 0;">
                              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse; border:1px solid #d6d9e0; border-radius:14px; background:#ffffff;">
                                <tr>
                                  <td style="padding:16px 18px; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:22px; color:#1f2937;">
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
                              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse; border:1px solid #d6d9e0; border-radius:14px; background:#ffffff;">
                                <tr>
                                  <td style="padding:16px 18px; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:22px; color:#1f2937;">
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

                          <tr>
                            <td style="padding:0; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:22px; color:#4b5563;">
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
}
