#!/usr/bin/env tsx
/**
 * Purge objects under given prefixes from a Supabase Storage bucket.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/purge-prefix.ts --bucket local-content hero lp-grid
 */
import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('[purge-prefix] Missing SUPABASE_URL or SERVICE key');
  process.exit(1);
}

const args = process.argv.slice(2);
let bucket = 'local-content';
if (args[0] === '--bucket' && args[1]) {
  bucket = args[1];
  args.splice(0, 2);
}
const prefixes = args.length > 0 ? args : ['hero', 'lp-grid'];

const client = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function listRecursive(prefix: string): Promise<string[]> {
  const out: string[] = [];
  const stack: string[] = [prefix.replace(/^\/+|\/+$/g, '')];
  while (stack.length) {
    const cur = stack.pop()!;
    const { data, error } = await client.storage.from(bucket).list(cur, { limit: 1000 } as any);
    if (error) throw error;
    for (const e of (data || []) as any[]) {
      const key = cur ? `${cur.replace(/\/$/, '')}/${e.name}` : e.name;
      if (e.metadata && e.metadata.size !== undefined) out.push(key);
      else stack.push(key);
    }
  }
  return out;
}

async function purge() {
  let removed = 0;
  for (const p of prefixes) {
    const files = await listRecursive(p);
    if (files.length === 0) { console.log(`[purge] no objects under ${bucket}/${p}`); continue; }
    console.log(`[purge] deleting ${files.length} objects under ${bucket}/${p}`);
    for (let i = 0; i < files.length; i += 100) {
      const chunk = files.slice(i, i + 100);
      const { error } = await client.storage.from(bucket).remove(chunk as any);
      if (error) throw error;
      removed += chunk.length;
      console.log(`[purge] removed ${Math.min(i + 100, files.length)}/${files.length}`);
    }
  }
  console.log(`[purge] done. removed=${removed}`);
}

purge().catch(e => { console.error('purge error:', e?.message || e); process.exit(1); });

