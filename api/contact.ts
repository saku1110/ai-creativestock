import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers for all responses
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
            text: `お問い合わせが届きました\n名前: ${name}\nメール: ${from_email}\n件名: ${subject}\n---\n${message}`,
          }),
        } as any);
      } catch (e) {
        // 続行（Webhookが失敗してもフォームは受理）
      }
    }

    // Email delivery: try Resend first, then SMTP (Nodemailer)
    const toEmail = process.env.CONTACT_TO_EMAIL || process.env.SUPPORT_EMAIL;
    const fromSystemEmail = process.env.CONTACT_FROM_EMAIL || process.env.SYSTEM_FROM_EMAIL;

    const emailSubject = `[お問い合わせ] ${subject}`;
    const emailText = [
      '以下の内容でお問い合わせを受け付けました。',
      '',
      `名前: ${name}`,
      `メール: ${from_email}`,
      `件名: ${subject}`,
      '---',
      message,
    ].join('\n');

    if (!toEmail) {
      return res.status(500).json({ error: 'CONTACT_TO_EMAIL (または SUPPORT_EMAIL) が未設定です。' });
    }

    // Try Resend
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: fromSystemEmail || 'no-reply@ai-creative-stock.com',
          to: [toEmail],
          subject: emailSubject,
          text: emailText,
          reply_to: from_email,
        } as any);
        return res.status(200).json({ ok: true, provider: 'resend' });
      } catch (e: any) {
        // continue to SMTP fallback
      }
    }

    // Try SMTP via Nodemailer
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpSecure = (process.env.SMTP_SECURE || '').toLowerCase() === 'true' || smtpPort === 465;

    if (smtpHost && smtpUser && smtpPass) {
      try {
        const { default: nodemailer } = (await import('nodemailer')) as any;
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort || (smtpSecure ? 465 : 587),
          secure: smtpSecure,
          auth: { user: smtpUser, pass: smtpPass },
        } as any);

        // First attempt: respect CONTACT_FROM_EMAIL if provided
        try {
          await transporter.sendMail({
            from: fromSystemEmail || smtpUser,
            to: toEmail,
            subject: emailSubject,
            text: emailText,
            replyTo: from_email,
            envelope: { from: smtpUser, to: toEmail },
          } as any);
        } catch (firstErr: any) {
          // Fallback attempt: force From header to smtpUser as well
          await transporter.sendMail({
            from: smtpUser,
            to: toEmail,
            subject: emailSubject,
            text: emailText,
            replyTo: from_email,
            envelope: { from: smtpUser, to: toEmail },
          } as any);
        }

        return res.status(200).json({ ok: true, provider: 'smtp' });
      } catch (e: any) {
        return res.status(500).json({ error: `メール送信に失敗しました: ${e?.message || 'unknown error'}` });
      }
    }

    // No provider configured
    return res.status(500).json({ error: 'メール送信の設定がありません。RESEND_API_KEY または SMTP_* と CONTACT_TO_EMAIL を設定してください。' });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'unknown error' });
  }
}
