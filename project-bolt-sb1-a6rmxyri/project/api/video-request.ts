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

const sanitize = (value?: string | null) =>
  typeof value === 'string' ? value.trim() : '';

const hasAnyDetail = (payload: VideoRequestBody) =>
  [
    payload.age,
    payload.gender,
    payload.bodyType,
    payload.background,
    payload.scene,
    payload.faceDetail,
    payload.notes
  ].some((value) => sanitize(value).length > 0);

const formatTimestamp = () =>
  new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date());

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
    process.env.VIDEO_REQUEST_TO_EMAIL ||
    process.env.CONTACT_TO_EMAIL ||
    process.env.SUPPORT_EMAIL ||
    null;

  if (!toEmail) {
    throw new Error('VIDEO_REQUEST_TO_EMAIL or CONTACT_TO_EMAIL must be configured');
  }

  const fromEmail =
    process.env.VIDEO_REQUEST_FROM_EMAIL ||
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
    const payload = (req.body || {}) as VideoRequestBody;
    const requestData: VideoRequestBody = {
      age: sanitize(payload.age),
      gender: sanitize(payload.gender),
      bodyType: sanitize(payload.bodyType),
      background: sanitize(payload.background),
      scene: sanitize(payload.scene),
      faceDetail: sanitize(payload.faceDetail),
      notes: sanitize(payload.notes),
      userEmail: sanitize(payload.userEmail || undefined) || null,
      userId: sanitize(payload.userId || undefined) || null,
      requestedAt: payload.requestedAt || formatTimestamp()
    };

    if (!hasAnyDetail(requestData)) {
      return res.status(400).json({ error: 'Missing request details' });
    }

    const smtp = getSmtpConfig();
    const { default: nodemailer } = (await import('nodemailer')) as any;
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: { user: smtp.user, pass: smtp.pass }
    } as any);

    const lines = [
      'AI Creative Stock received a new video request.',
      '',
      `Scene: ${requestData.scene || 'N/A'}`,
      `Age: ${requestData.age || 'N/A'}`,
      `Gender: ${requestData.gender || 'N/A'}`,
      `Body type: ${requestData.bodyType || 'N/A'}`,
      `Background: ${requestData.background || 'N/A'}`,
      `Face detail: ${requestData.faceDetail || 'N/A'}`,
      `Notes: ${requestData.notes || 'N/A'}`,
      '',
      `User email: ${requestData.userEmail || 'guest'}`,
      `User ID: ${requestData.userId || 'guest'}`,
      `Requested at: ${requestData.requestedAt}`
    ];

    await transporter.sendMail({
      from: smtp.fromEmail,
      to: smtp.toEmail,
      subject: `[Video Request] ${requestData.scene || 'No scene provided'}`,
      text: lines.join('\n'),
      replyTo: requestData.userEmail || undefined,
      envelope: { from: smtp.user, to: smtp.toEmail }
    } as any);

    console.log('[video-request] sent via SMTP');
    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error('[video-request] error', error);
    return res.status(500).json({ error: error?.message || 'unknown error' });
  }
}
