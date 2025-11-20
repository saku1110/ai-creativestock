import type { VercelRequest, VercelResponse } from '@vercel/node';

// Contact form handler: tries Slack webhook, then SMTP if configured.
// If no destinations are configured, it returns 200 with a warning to avoid blocking users.
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

    if (!name || !from_email || !subject || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const slackWebhook = process.env.SLACK_WEBHOOK_URL || process.env.CONTACT_SLACK_WEBHOOK_URL;
    if (slackWebhook) {
      try {
        await fetch(slackWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: [
              '【お問い合わせ】',
              `お名前: ${name}`,
              `メール: ${from_email}`,
              `件名: ${subject}`,
              '---',
              message,
            ].join('\n'),
          }),
        } as any);
      } catch (e) {
        console.warn('[contact] slack webhook error', e);
      }
    }

    const toEmail = process.env.CONTACT_TO_EMAIL || process.env.SUPPORT_EMAIL;
    const fromSystemEmail = process.env.CONTACT_FROM_EMAIL || process.env.SYSTEM_FROM_EMAIL || process.env.SMTP_USER;

    const emailSubject = `[AI Creative Stock] ${subject}`;
    const emailText = [
      'お問い合わせを受け付けました。',
      '',
      `お名前: ${name}`,
      `メール: ${from_email}`,
      `件名: ${subject}`,
      '---',
      message,
    ].join('\n');

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpSecure = (process.env.SMTP_SECURE || '').toLowerCase() === 'true' || smtpPort === 465;

    // If no email destination is configured, accept the request to avoid blocking the user.
    if (!toEmail) {
      console.warn('[contact] missing CONTACT_TO_EMAIL / SUPPORT_EMAIL, email skipped');
      return res.status(200).json({ ok: true, provider: slackWebhook ? 'slack-only' : 'none', warning: 'no_email_config' });
    }

    if (smtpHost && smtpUser && smtpPass) {
      try {
        const { default: nodemailer } = (await import('nodemailer')) as any;
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort || (smtpSecure ? 465 : 587),
          secure: smtpSecure,
          auth: { user: smtpUser, pass: smtpPass },
        } as any);

        await transporter.sendMail({
          from: fromSystemEmail || smtpUser,
          to: toEmail,
          subject: emailSubject,
          text: emailText,
          replyTo: from_email,
          envelope: { from: smtpUser, to: toEmail },
        } as any);

        console.log('[contact] sent via SMTP');
        return res.status(200).json({ ok: true, provider: 'smtp' });
      } catch (e: any) {
        console.error('[contact] SMTP error', e);
        // Do not fail the user flow; return 200 with warning
        return res.status(200).json({ ok: true, provider: 'smtp', warning: e?.message || 'smtp_error' });
      }
    }

    console.warn('[contact] SMTP not configured, email skipped');
    return res.status(200).json({ ok: true, provider: 'none', warning: 'no_smtp_config' });
  } catch (e: any) {
    console.error('[contact] unhandled error', e);
    return res.status(500).json({ error: e?.message || 'unknown error' });
  }
}
