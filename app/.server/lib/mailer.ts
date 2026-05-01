import nodemailer from 'nodemailer';

import { env } from './utils';

// ─── 트랜스포터 (싱글톤) ───────────────────────────────────

let _transporter: nodemailer.Transporter | null = null;

const getTransporter = () => {
  if (_transporter) return _transporter;

  _transporter = nodemailer.createTransport({
    host: env('SMTP_HOST'),
    port: Number(env('SMTP_PORT', '587')),
    secure: env('SMTP_PORT', '587') === '465',
    auth: {
      user: env('SMTP_USER'),
      pass: env('SMTP_PASS'),
    },
  });

  return _transporter;
};

// ─── 메일 발송 ─────────────────────────────────────────────

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendMail = async (options: SendMailOptions) => {
  const transporter = getTransporter();
  const from = `"운결 ✨" <${env('SMTP_FROM', env('SMTP_USER'))}>`;

  await transporter.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
};
