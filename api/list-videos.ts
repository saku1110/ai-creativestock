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
    const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!SUPABASE_URL) {
      return res.status(200).json({ bucket: req.query.bucket || 'videos', prefix: req.query.prefix || '', count: 0, items: [] });

    }

    const bucket = (req.query.bucket as string) || 'videos';
    const prefix = (req.query.prefix as string) || '';
    const limit = Math.min(parseInt((req.query.limit as string) || '1000', 10) || 1000, 2000);
    const expires = Math.min(parseInt((req.query.expires as string) || '21600', 10) || 21600, 60 * 60 * 24 * 7); // default 6h

    const client = createClient(SUPABASE_URL, SERVICE_KEY || ANON_KEY || '', { auth: { persistSession: false } });

    const { data, error } = await client.storage.from(bucket).list(prefix, {
      limit,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' }
    } as any);
    if (error) return res.status(500).json({ error: error.message });

    const entries = (data || []).filter((f: any) => /\.(mp4|webm)$/i.test(f.name));
    const paths = entries.map((f: any) => `${prefix ? prefix.replace(/\/$/, '') + '/' : ''}${f.name}`);

    const items = (
      await Promise.all(paths.map(async (p) => {
        if (SERVICE_KEY) { const { data: signed, error: signErr } = await client.storage.from(bucket).createSignedUrl(p, expires); if (signErr || !signed) return null; return { path: p, url: signed.signedUrl }; } const { data } = client.storage.from(bucket).getPublicUrl(p); return data?.publicUrl ? { path: p, url: data.publicUrl } : null;
      }))
    ).filter(Boolean);

    return res.status(200).json({ bucket, prefix, count: items.length, items });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'unknown error' });
  }
}

