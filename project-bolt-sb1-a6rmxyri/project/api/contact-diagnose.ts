import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const present = (v: any) => (v ? true : false);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    ok: true,
    region: process.env.VERCEL_REGION || 'unknown',
    node: process.version,
    env: {
      SMTP_HOST: present(process.env.SMTP_HOST),
      SMTP_PORT: present(process.env.SMTP_PORT),
      SMTP_SECURE: present(process.env.SMTP_SECURE),
      SMTP_USER: present(process.env.SMTP_USER),
      SMTP_PASS: present(process.env.SMTP_PASS),
      CONTACT_TO_EMAIL: present(process.env.CONTACT_TO_EMAIL) || present(process.env.SUPPORT_EMAIL),
      CONTACT_FROM_EMAIL: present(process.env.CONTACT_FROM_EMAIL) || present(process.env.SYSTEM_FROM_EMAIL),
      RESEND_API_KEY: present(process.env.RESEND_API_KEY),
    },
    vercel: {
      url: process.env.VERCEL_URL || null,
      env: process.env.VERCEL_ENV || null,
    },
  });
}

