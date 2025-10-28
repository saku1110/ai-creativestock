import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './_supabaseAdmin.js';

/**
 * GET /api/list-videos?bucket=<bucket>&prefix=<prefix>&limit=<n>&expires=<seconds>
 * Returns signed URLs for files in the given storage prefix.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const bucket = (req.query.bucket as string) || 'videos';
    const prefix = (req.query.prefix as string) || '';
    const limit = Math.min(parseInt((req.query.limit as string) || '100', 10) || 100, 1000);
    const expires = Math.min(parseInt((req.query.expires as string) || '3600', 10) || 3600, 60 * 60 * 24 * 7);

    const listRes = await supabaseAdmin.storage.from(bucket).list(prefix, {
      limit,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' }
    } as any);

    if (listRes.error) {
      return res.status(500).json({ error: listRes.error.message });
    }

    const files = (listRes.data || []).filter((f: any) => !f.metadata?.mimetype || /video\//.test(f.metadata.mimetype) || /\.(mp4|webm|mov|ogg)$/i.test(f.name));

    const paths = files.map((f: any) => `${prefix ? prefix.replace(/\/$/, '') + '/' : ''}${f.name}`);
    const signed = await Promise.all(
      paths.map(async (p) => {
        const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(p, expires);
        if (error || !data) return null;
        return { path: p, url: data.signedUrl };
      })
    );

    const items = signed.filter(Boolean);
    return res.status(200).json({ bucket, prefix, count: items.length, items });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'unknown error' });
  }
}

