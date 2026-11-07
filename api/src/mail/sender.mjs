import nodemailer from 'nodemailer';
import { env } from '../config/env.mjs';
export function createSender({ smtpUrl = env.smtpUrl, mailFrom = env.mailFrom } = {}) {
  const transport = smtpUrl && nodemailer.createTransport({
    url: smtpUrl, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000
  });
  return async (job) => {
    if (!transport) throw new Error('SMTP_URL is not configured');
    await transport.sendMail({
      from: mailFrom, to: job.recipient, subject: job.subject, text: job.text,
      messageId: '<campus-registration-' + job.id + '@campus-events.local>'
    });
  };
}
