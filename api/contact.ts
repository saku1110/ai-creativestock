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

    // TODO: 必要ならメール送信やDB保存を追加
    return res.status(200).json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'unknown error' });
  }
}
