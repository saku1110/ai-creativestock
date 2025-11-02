#!/usr/bin/env tsx

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

type Options = {
  bucket: string;
  public: boolean;
};

function parseArgs(argv: string[]): Options {
  const opts: Options = { bucket: 'local-content', public: true };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const v = argv[i + 1];
    switch (a) {
      case '--bucket':
        if (!v) throw new Error('--bucket requires a value');
        opts.bucket = v; i++; break;
      case '--public':
        opts.public = true; break;
      case '--private':
        opts.public = false; break;
      default:
        break;
    }
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv);

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
    process.exit(1);
  }

  const client = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const storage: any = (client as any).storage;

  try {
    const bucketsRes = await storage.listBuckets?.();
    const buckets: Array<{ name: string }> | null = bucketsRes?.data ?? null;
    const exists = Array.isArray(buckets) && buckets.some((b) => b.name === opts.bucket);
    if (exists) {
      console.log(`[ensure-bucket] exists: ${opts.bucket}`);
      return;
    }

    const { error } = await storage.createBucket?.(opts.bucket, { public: opts.public });
    if (error) {
      console.error('[ensure-bucket] createBucket failed:', error);
      process.exit(1);
    }
    console.log(`[ensure-bucket] created: ${opts.bucket} (public=${opts.public})`);
  } catch (e: any) {
    console.error('[ensure-bucket] error:', e?.message || e);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('ensure-bucket.ts')) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main();
}

