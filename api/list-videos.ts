import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_KEY' });
    }

    const bucket = (req.query.bucket as string) || 'videos';
    const prefix = (req.query.prefix as string) || '';
    const limit = Math.min(parseInt((req.query.limit as string) || '1000', 10) || 1000, 2000);
    const expires = Math.min(parseInt((req.query.expires as string) || '21600', 10) || 21600, 60 * 60 * 24 * 7); // default 6h

    const client = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    const { data, error } = await client.storage.from(bucket).list(prefix, {
      limit,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' }
    } as any);
    if (error) return res.status(500).json({ error: error.message });

    const entries = (data || []).filter((f: any) => /\.(mp4|webm|mov|ogg)$/i.test(f.name));
    const paths = entries.map((f: any) => `${prefix ? prefix.replace(/\/$/, '') + '/' : ''}${f.name}`);

    const items = (
      await Promise.all(paths.map(async (p) => {
        const { data: signed, error: signErr } = await client.storage.from(bucket).createSignedUrl(p, expires);
        if (signErr || !signed) return null;
        return { path: p, url: signed.signedUrl };
      }))
    ).filter(Boolean);

    return res.status(200).json({ bucket, prefix, count: items.length, items });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'unknown error' });
  }
}

