#!/usr/bin/env tsx

/**
 * Normalizes Supabase Storage keys by flattening accidental nested prefixes.
 *
 * Use case:
 *  - Bucket "local-content" contains an extra nested folder "local-content/..."
 *  - We want to move everything from "local-content/<sub>" to "<sub>" (bucket root)
 *  - Typical targets: hero/*, lp-grid/*, dashboard/**/*
 *
 * Requirements:
 *  - SUPABASE_URL
 *  - SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY)
 *
 * Example (dry run):
 *  npx tsx project-bolt-sb1-a6rmxyri/project/scripts/normalize-storage.ts \
 *     --bucket local-content --prefix local-content --concurrency 4
 *
 * Execute (apply changes):
 *  npx tsx project-bolt-sb1-a6rmxyri/project/scripts/normalize-storage.ts \
 *     --bucket local-content --prefix local-content --concurrency 4 --execute
 */

import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';

type Entry = {
  name: string;
  id?: string;
  updated_at?: string;
  created_at?: string;
  last_accessed_at?: string;
  metadata?: any;
};

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const args = process.argv.slice(2);
const getArg = (key: string, def?: string) => {
  const i = args.indexOf(key);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const hasFlag = (flag: string) => args.includes(flag);

const bucket = getArg('--bucket', 'local-content')!;
const nestedPrefix = (getArg('--prefix', 'local-content') || '').replace(/^\/+|\/+$/g, '');
const concurrency = Math.max(1, parseInt(getArg('--concurrency', '4') || '4', 10));
const execute = hasFlag('--execute') || hasFlag('--commit');
const overwrite = hasFlag('--overwrite');

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('[normalize-storage] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

function isFile(e: Entry): boolean {
  // Supabase returns metadata for files; folders have no metadata
  return !!(e as any).metadata || (e as any).id !== undefined;
}

async function listRecursive(prefix: string): Promise<string[]> {
  const files: string[] = [];
  const stack: string[] = [prefix.replace(/^\/+|\/+$/g, '')];

  while (stack.length) {
    const current = stack.pop()!;
    const { data, error } = await supabase.storage.from(bucket).list(current, {
      limit: 1000,
      sortBy: { column: 'name', order: 'asc' } as any
    } as any);
    if (error) throw error;
    for (const e of (data || []) as Entry[]) {
      if (e.name === '.' || e.name === '..') continue;
      const key = current ? `${current.replace(/\/$/, '')}/${e.name}` : e.name;
      if (isFile(e)) {
        files.push(key);
      } else {
        stack.push(key);
      }
    }
  }
  return files;
}

function destFromNested(key: string): string {
  // Strip the first segment equal to nestedPrefix
  const parts = key.split('/').filter(Boolean);
  if (parts[0] && parts[0] === nestedPrefix) {
    return parts.slice(1).join('/');
  }
  // Also handle repeated nestedPrefix/local-content/local-content/... just in case
  const idx = parts.indexOf(nestedPrefix);
  if (idx >= 0) return [...parts.slice(0, idx), ...parts.slice(idx + 1)].join('/');
  return key;
}

async function exists(key: string): Promise<boolean> {
  const dir = key.includes('/') ? key.split('/').slice(0, -1).join('/') : '';
  const name = key.split('/').pop()!;
  const { data } = await supabase.storage.from(bucket).list(dir, { limit: 1000 } as any);
  return !!(data || []).find(e => (e as any).name === name);
}

async function moveOne(from: string, to: string): Promise<void> {
  if (from === to) return;
  if (!execute) {
    console.log(`[dry-run] move ${from} -> ${to}`);
    return;
  }
  if (!overwrite && (await exists(to))) {
    console.warn(`[skip] destination exists: ${to}`);
    return;
  }
  // Try move API first
  const mv = await supabase.storage.from(bucket).move(from, to);
  if (!(mv as any).error) {
    console.log(`[moved] ${from} -> ${to}`);
    return;
  }
  // Fallback: copy + remove
  const cp = await supabase.storage.from(bucket).copy(from, to as any);
  if ((cp as any).error) throw (cp as any).error;
  const rm = await supabase.storage.from(bucket).remove([from]);
  if ((rm as any).error) throw (rm as any).error[0] || (rm as any).error;
  console.log(`[copied+removed] ${from} -> ${to}`);
}

async function main() {
  console.log(`Normalizing bucket="${bucket}" nestedPrefix="${nestedPrefix}" concurrency=${concurrency} execute=${execute}`);
  const nestedFiles = await listRecursive(nestedPrefix);
  if (nestedFiles.length === 0) {
    console.log('No nested files found. Nothing to do.');
    return;
  }

  const pairs = nestedFiles.map((src) => ({ src, dst: destFromNested(src) }));
  const total = pairs.length;
  console.log(`Found ${total} objects under "${nestedPrefix}/"`);

  let idx = 0;
  const workers = Array.from({ length: Math.min(concurrency, total) }, async () => {
    while (true) {
      const i = idx++;
      if (i >= total) break;
      const p = pairs[i];
      try {
        await moveOne(p.src, p.dst);
      } catch (e: any) {
        console.error(`[error] ${p.src} -> ${p.dst}:`, e?.message || e);
      }
    }
  });
  await Promise.all(workers);
  console.log('Done.');
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});