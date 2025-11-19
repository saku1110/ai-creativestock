import type { VercelRequest, VercelResponse } from '@vercel/node';

const sanitize = (value?: string | null) =>
  typeof value === 'string' ? value.trim() : '';

const getSmtpConfig = () => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const secure =
    (process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;

  if (!host || !user || !pass) {
    throw new Error('SMTP_HOST/USER/PASS must be configured');
  }

  const toEmail =
    process.env.CONTACT_TO_EMAIL || process.env.SUPPORT_EMAIL || null;

  if (!toEmail) {
    throw new Error('CONTACT_TO_EMAIL or SUPPORT_EMAIL must be configured');
  }

  const fromEmail =
    process.env.CONTACT_FROM_EMAIL ||
    process.env.SYSTEM_FROM_EMAIL ||
    user;

  return { host, user, pass, port: port || (secure ? 465 : 587), secure, toEmail, fromEmail };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { name, from_email, subject, message } = (req.body || {}) as Record<string, string>;

    const safeName = sanitize(name);
    const safeFrom = sanitize(from_email);
    const safeSubject = sanitize(subject);
    const safeMessage = sanitize(message);

    if (!safeName || !safeFrom || !safeSubject || !safeMessage) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const smtp = getSmtpConfig();
    const { default: nodemailer } = (await import('nodemailer')) as any;
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: { user: smtp.user, pass: smtp.pass }
    } as any);

    const body = [
      'You have received a new contact request from AI Creative Stock.',
      '',
      `Name: ${safeName}`,
      `Email: ${safeFrom}`,
      `Subject: ${safeSubject}`,
      '',
      safeMessage
    ].join('\n');

    await transporter.sendMail({
      from: smtp.fromEmail,
      to: smtp.toEmail,
      subject: `[Contact] ${safeSubject}`,
      text: body,
      replyTo: safeFrom,
      envelope: { from: smtp.user, to: smtp.toEmail }
    } as any);

    console.log('[contact] sent via SMTP');
    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error('[contact] error', error);
    return res.status(500).json({ error: error?.message || 'unknown error' });
  }
}
