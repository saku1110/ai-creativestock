import type { VercelRequest, VercelResponse } from '@vercel/node';

interface VideoRequestBody {
  age?: string;
  gender?: string;
  bodyType?: string;
  background?: string;
  scene?: string;
  faceDetail?: string;
  notes?: string;
  userEmail?: string | null;
  userId?: string | null;
  requestedAt?: string;
}

const sanitize = (value?: string | null) => (typeof value === 'string' ? value.trim() : '');

const hasAnyDetail = (payload: VideoRequestBody) => {
  return [
    payload.age,
    payload.gender,
    payload.bodyType,
    payload.background,
    payload.scene,
    payload.faceDetail,
    payload.notes,
  ].some((value) => sanitize(value).length > 0);
};

const formatJstTimestamp = () =>
  new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());

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
    const body = (req.body || {}) as VideoRequestBody;
    const requestData: VideoRequestBody = {
      age: sanitize(body.age),
      gender: sanitize(body.gender),
      bodyType: sanitize(body.bodyType),
      background: sanitize(body.background),
      scene: sanitize(body.scene),
      faceDetail: sanitize(body.faceDetail),
      notes: sanitize(body.notes),
      userEmail: sanitize(body.userEmail || undefined) || null,
      userId: sanitize(body.userId || undefined) || null,
      requestedAt: body.requestedAt || formatJstTimestamp(),
    };

    if (!hasAnyDetail(requestData)) {
      return res.status(400).json({ error: '動画リクエストの内容が空です' });
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
    const smtpSecure = (process.env.SMTP_SECURE || '').toLowerCase() === 'true' || smtpPort === 465;
    const fromSystemEmail =
      process.env.VIDEO_REQUEST_FROM_EMAIL ||
      process.env.CONTACT_FROM_EMAIL ||
      process.env.SYSTEM_FROM_EMAIL ||
      smtpUser;
    const toEmail =
      process.env.VIDEO_REQUEST_TO_EMAIL ||
      process.env.CONTACT_TO_EMAIL ||
      process.env.SUPPORT_EMAIL;

    if (!smtpHost || !smtpUser || !smtpPass) {
      return res.status(500).json({ error: 'SMTP_* が設定されていません' });
    }

    if (!toEmail) {
      return res.status(500).json({ error: 'VIDEO_REQUEST_TO_EMAIL か CONTACT_TO_EMAIL を設定してください' });
    }

    const slackWebhook =
      process.env.VIDEO_REQUEST_SLACK_WEBHOOK_URL ||
      process.env.SLACK_WEBHOOK_URL ||
      process.env.CONTACT_SLACK_WEBHOOK_URL;

    const emailSubject = `[動画リクエスト] ${requestData.scene || '詳細未設定'}`;
    const emailLines = [
      'AI Creative Stock で動画リクエストを受信しました。',
      '',
      `希望シーン: ${requestData.scene || '未入力'}`,
      `年齢: ${requestData.age || '未入力'}`,
      `性別: ${requestData.gender || '未入力'}`,
      `体型: ${requestData.bodyType || '未入力'}`,
      `背景: ${requestData.background || '未入力'}`,
      `顔のディテール: ${requestData.faceDetail || '未入力'}`,
      `メモ: ${requestData.notes || '未入力'}`,
      '',
      `ユーザー: ${requestData.userEmail || '未ログイン'}`,
      `ユーザーID: ${requestData.userId || '未ログイン'}`,
      `受付日時: ${requestData.requestedAt}`,
    ];

    if (slackWebhook) {
      try {
        await fetch(slackWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: [
              ':clapper: 動画リクエストを受信しました',
              `シーン: ${requestData.scene || '未入力'}`,
              `ユーザー: ${requestData.userEmail || '未ログイン'}`,
              `リクエスト日時: ${requestData.requestedAt}`,
            ].join('\n'),
          }),
        } as any);
      } catch {
        // ignore Slack notification errors
      }
    }

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
      text: emailLines.join('\n'),
      replyTo: requestData.userEmail || undefined,
      envelope: { from: smtpUser, to: toEmail },
    } as any);

    console.log('[video-request] sent via SMTP');
    return res.status(200).json({ ok: true, provider: 'smtp' });
  } catch (error: any) {
    console.error('[video-request] error', error);
    return res.status(500).json({ error: error?.message || 'unknown error' });
  }
}
