import 'dotenv/config';
import chokidar from 'chokidar';
import path from 'path';
import { createReadStream } from 'fs';
import { createClient } from '@supabase/supabase-js';

type Scheme = 'dir' | 'regex';

interface Options {
  dir: string;
  bucket: string;
  scheme: Scheme;
  regex?: string;
  upsert: boolean;
  moveTo?: string;
  deleteAfter?: boolean;
}

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    dir: '',
    bucket: '',
    scheme: 'dir',
    regex: '^(?<category>[^_\-]+)[_\-]',
    upsert: true,
    moveTo: undefined,
    deleteAfter: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const v = argv[i + 1];
    switch (a) {
      case '--dir': opts.dir = v || ''; i++; break;
      case '--bucket': opts.bucket = v || ''; i++; break;
      case '--scheme': opts.scheme = (v === 'regex' ? 'regex' : 'dir'); i++; break;
      case '--regex': opts.regex = v; i++; break;
      case '--no-upsert': opts.upsert = false; break;
      case '--move-to': opts.moveTo = v; i++; break;
      case '--delete-after': opts.deleteAfter = true; break;
      default: break;
    }
  }
  if (!opts.dir) throw new Error('--dir is required');
  if (!opts.bucket) throw new Error('--bucket is required');
  return opts;
}

// Minimal structural type for storage calls
type StorageBucketApi = {
  createSignedUploadUrl: (path: string) => Promise<{ data: { token: string } | null; error: { message?: string } | null }>;
  uploadToSignedUrl: (path: string, token: string, body: Blob, opts?: unknown) => Promise<{ error: { message?: string } | null }>;
};
type AnySupabaseClient = { storage: { from: (bucket: string) => StorageBucketApi } };

/**
 * Derive destination prefix from the relative path or filename.
 *
 * - For scheme 'dir':
 *   - hero/<file>          -> prefix: hero
 *   - lp-grid/<file>       -> prefix: lp-grid
 *   - dashboard/<cat>/<f>  -> prefix: dashboard/<cat>
 * - For scheme 'regex':
 *   - Uses the first capture group or named group 'category' in filename.
 */
function extractPrefix(filename: string, relPath: string, scheme: Scheme, regex?: string): string {
  if (scheme === 'dir') {
    const parts = relPath.split(/[\\/]/).filter(Boolean);
    if (parts[0] === 'dashboard') {
      const cat = parts[1] || 'uncategorized';
      return `dashboard/${cat}`;
    }
    return parts[0] || 'uncategorized';
  }
  const base = path.basename(filename);
  const pattern = regex ?? '^(?<category>[^_\-]+)[_\-]';
  const re = new RegExp(pattern);
  const m = re.exec(base);
  if (!m) return 'uncategorized';
  const cat = (m.groups?.category ?? m[1] ?? '').trim();
  return cat || 'uncategorized';
}

async function uploadFile(client: AnySupabaseClient, bucket: string, localPath: string, destPath: string, upsert: boolean): Promise<void> {
  const { data, error } = await client.storage.from(bucket).createSignedUploadUrl(destPath);
  if (error || !data) throw new Error(error?.message || 'failed to create signed upload url');
  const stream = createReadStream(localPath);
  const { error: upErr } = await client.storage.from(bucket).uploadToSignedUrl(destPath, data.token, stream as unknown as Blob, {
    contentType: 'video/mp4',
    upsert,
  } as any);
  if (upErr) throw new Error(upErr.message || 'uploadToSignedUrl failed');
}

async function main() {
  const opts = parseArgs(process.argv);

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  const client = createClient(SUPABASE_URL, SUPABASE_KEY) as unknown as AnySupabaseClient;

  console.log(`[watch] ${opts.dir} -> bucket=${opts.bucket} scheme=${opts.scheme}`);
  const watcher = chokidar.watch(opts.dir, {
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 100 },
  });

  const onAdd = async (full: string) => {
    try {
      const lower = full.toLowerCase();
      if (!(/[.](mp4|webm|mov|ogg)$/i.test(lower))) return;
      const rel = path.relative(opts.dir, full);
      const prefix = extractPrefix(full, rel, opts.scheme, opts.regex);
      const destPath = path.posix.join(prefix, path.basename(full));
      console.log(`[upload] ${rel} -> ${opts.bucket}/${destPath}`);
      await uploadFile(client, opts.bucket, full, destPath, opts.upsert);
      console.log(`[ok] ${rel}`);
    } catch (e: any) {
      console.warn(`[fail] ${full}: ${e?.message || e}`);
    }
  };

  watcher.on('add', (p) => void onAdd(p));
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('supa-watch.ts')) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main();
}
