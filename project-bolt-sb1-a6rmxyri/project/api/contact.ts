import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[contact] start', {
    region: process.env.VERCEL_REGION,
    hasSMTP: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
    hasTo: Boolean(process.env.CONTACT_TO_EMAIL || process.env.SUPPORT_EMAIL),
  });

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
            text: `縺雁撫縺・粋繧上○縺悟ｱ翫″縺ｾ縺励◆\n蜷榊燕: ${name}\n繝｡繝ｼ繝ｫ: ${from_email}\n莉ｶ蜷・ ${subject}\n---\n${message}`,
          }),
        } as any);
      } catch {
        // ignore webhook failure
      }
    }

    // お名前メール（SMTP）での送信
    const toEmail = process.env.CONTACT_TO_EMAIL || process.env.SUPPORT_EMAIL;
    const fromSystemEmail = process.env.CONTACT_FROM_EMAIL || process.env.SYSTEM_FROM_EMAIL || process.env.SMTP_USER;

    const emailSubject = `[縺雁撫縺・粋繧上○] ${subject}`;
    const emailText = [
      '莉･荳九・蜀・ｮｹ縺ｧ縺雁撫縺・粋繧上○繧貞女縺台ｻ倥￠縺ｾ縺励◆縲・,
      '',
      `蜷榊燕: ${name}`,
      `繝｡繝ｼ繝ｫ: ${from_email}`,
      `莉ｶ蜷・ ${subject}`,
      '---',
      message,
    ].join('\n');

    if (!toEmail) {
      console.error('[contact] missing CONTACT_TO_EMAIL');
      return res.status(500).json({ error: 'CONTACT_TO_EMAIL (縺ｾ縺溘・ SUPPORT_EMAIL) 縺梧悴險ｭ螳壹〒縺吶・ });
    }

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
        } as any;

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
        return res.status(500).json({ error: `繝｡繝ｼ繝ｫ騾∽ｿ｡縺ｫ螟ｱ謨励＠縺ｾ縺励◆: ${e?.message || 'unknown error'}` });
      }
    }

    console.error('[contact] no email provider configured');
    return res.status(500).json({ error: 'SMTP_* 縺ｨ CONTACT_TO_EMAIL (縺ｾ縺溘・ SUPPORT_EMAIL) 繧定ｨｭ螳壹＠縺ｦ縺上□縺輔＞縲・ });
  } catch (e: any) {
    console.error('[contact] unhandled error', e);
    return res.status(500).json({ error: e?.message || 'unknown error' });
  }
}
