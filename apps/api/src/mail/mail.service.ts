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
  loginEmail?: string;
  plainPassword?: string;
};

@Injectable()
export class MailService {
  constructor(private readonly config: ConfigService) {}

  private createTransporter(): Transporter<SMTPTransport.SentMessageInfo> {
    const host = this.config.get<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const secure = this.config.get<string>('SMTP_SECURE') === 'true';
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

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

    const from =
      this.config.get<string>('MAIL_FROM') ??
      this.config.get<string>('SMTP_USER') ??
      'no-reply@kopama.local';

    const profileZaufanyUrl =
      this.config.get<string>('PROFILE_ZAUFANY_URL') ??
      'https://www.gov.pl/web/gov/podpisz-dokument-elektronicznie-wykorzystaj-podpis-zaufany';

    const loginBlockText =
      params.loginEmail && params.plainPassword
        ? `Dane logowania do panelu:\nEmail: ${params.loginEmail}\nHasło: ${params.plainPassword}\n`
        : '';

    const loginBlockHtml =
      params.loginEmail && params.plainPassword
        ? `
          <p><strong>Dane logowania do panelu:</strong><br />
          Email: ${params.loginEmail}<br />
          Hasło: ${params.plainPassword}</p>
        `
        : '';

    const mailOptions: SendMailOptions = {
      from,
      to: params.to,
      subject: 'KopaMa – umowa testowa PDF i dalsze kroki',
      text: [
        `Dzień dobry ${params.fullName},`,
        'w załączniku przesyłamy testową wersję umowy w formacie PDF.',
        'Dokument możesz podpisać elektronicznie przy użyciu Profilu Zaufanego pod linkiem:',
        profileZaufanyUrl,
        loginBlockText,
        'To jest etap testowy – finalny wzór umowy zostanie jeszcze podmieniony.',
      ].join('\n\n'),
      html: `
        <p>Dzień dobry ${params.fullName},</p>
        <p>w załączniku przesyłamy testową wersję umowy w formacie PDF.</p>
        <p>
          Dokument możesz podpisać elektronicznie przy użyciu Profilu Zaufanego:
          <br />
          <a href="${profileZaufanyUrl}">${profileZaufanyUrl}</a>
        </p>
        ${loginBlockHtml}
        <p>To jest etap testowy – finalny wzór umowy zostanie jeszcze podmieniony.</p>
      `,
      attachments: [
        {
          filename: path.basename(params.contractAbsolutePath),
          path: params.contractAbsolutePath,
          contentType: 'application/pdf',
        },
      ],
    };

    await transporter.sendMail(mailOptions);
  }
}
