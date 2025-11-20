import type { VercelRequest, VercelResponse } from '@vercel/node';

// Contact form handler
// - Slack: ベストエフォート（失敗しても処理継続）
// - SMTP: メール送信が成功した場合のみ 200を返す
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

    // Slackはあれば通知（失敗しても継続）
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

    // SMTPメール送信
    const toEmail = process.env.CONTACT_TO_EMAIL || process.env.SUPPORT_EMAIL;
    const fromSystemEmail = process.env.CONTACT_FROM_EMAIL || process.env.SYSTEM_FROM_EMAIL || process.env.SMTP_USER;

    if (!toEmail) {
      return res.status(500).json({
        error: 'CONTACT_TO_EMAIL または SUPPORT_EMAIL が設定されていません',
      });
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpSecure = (process.env.SMTP_SECURE || '').toLowerCase() === 'true' || smtpPort === 465;

    if (!smtpHost || !smtpUser || !smtpPass) {
      return res.status(500).json({
        error: 'SMTP_HOST / SMTP_USER / SMTP_PASS が設定されていません',
      });
    }

    const { default: nodemailer } = (await import('nodemailer')) as any;
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort || (smtpSecure ? 465 : 587),
      secure: smtpSecure,
      auth: { user: smtpUser, pass: smtpPass },
    } as any);

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

    await transporter.sendMail({
      from: fromSystemEmail || smtpUser,
      to: toEmail,
      subject: emailSubject,
      text: emailText,
      replyTo: from_email,
      envelope: { from: smtpUser, to: toEmail },
    } as any);

    return res.status(200).json({ ok: true, provider: 'smtp' });
  } catch (e: any) {
    console.error('[contact] unhandled error', e);
    return res.status(500).json({ error: e?.message || 'unknown error' });
  }
}
