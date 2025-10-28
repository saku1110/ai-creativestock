import 'dotenv/config';
import chokidar from 'chokidar';
import path from 'path';
import { readFile } from 'fs/promises';
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

// skip rules: don't upload originals/ folder or *.original.* files
function shouldSkip(relPath: string): boolean {
  const parts = relPath.split(/\\\\|\//).filter(Boolean).map((s) => s.toLowerCase());
  if (parts.includes('originals')) return true;
  const base = parts[parts.length - 1] || '';
  if (/\\.original\\.[a-z0-9]+$/i.test(base)) return true;
  if (/^\./.test(base)) return true; // hidden/temp
  return false;
}

// make a storage-safe ASCII filename while keeping the original extension
function sanitizeBasename(name: string): string {
  const idx = name.lastIndexOf('.');
  const base = idx >= 0 ? name.slice(0, idx) : name;
  const ext = idx >= 0 ? name.slice(idx) : '';
  // allow only ascii [a-z0-9._-]
  let safe = base
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '');
  if (!safe) safe = `file-${Date.now()}`;
  // limit length to avoid overly long keys
  if (safe.length > 120) safe = safe.slice(0, 120);
  return `${safe}${ext}`;
}

async function uploadFile(client: AnySupabaseClient, bucket: string, localPath: string, destPath: string, upsert: boolean): Promise<void> {
  const { data, error } = await client.storage.from(bucket).createSignedUploadUrl(destPath);
  if (error || !data) throw new Error(error?.message || 'failed to create signed upload url');
  // Use Buffer -> Blob to avoid Node fetch "duplex" requirement for Readable streams
  const buf = await readFile(localPath);
  const blob = new Blob([buf], { type: 'video/mp4' });
  const { error: upErr } = await client.storage.from(bucket).uploadToSignedUrl(destPath, data.token, blob, {
    contentType: 'video/mp4',
    upsert,
  } as any);
  if (upErr) throw new Error(upErr.message || 'uploadToSignedUrl failed');
}

// best-effort check to avoid duplicate uploads with the same key
async function objectExists(client: AnySupabaseClient, bucket: string, key: string): Promise<boolean> {
  try {
    const dir = key.includes('/') ? key.split('/').slice(0, -1).join('/') : '';
    const name = key.split('/').pop() || key;
    const { data, error } = await (client.storage as any).from(bucket).list(dir, { limit: 1000 });
    if (error) return false;
    return (data || []).some((f: any) => f.name === name);
  } catch {
    return false;
  }
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

  
  param($m)
  $block = $m.Groups[1].Value
  $block = $block -replace "const rel = path.relative\(opts.dir, full\);", "const rel = path.relative(opts.dir, full);`n      if (shouldSkip(rel)) { console.log(`[skip] ${rel}`); return; }"
  $block = $block -replace "const destPath = path.posix.join\(prefix, safeBase\);", "const destPath = path.posix.join(prefix, safeBase);`n      if (uploadedKeys.has(destPath)) { console.log(`[dup] ${rel} -> ${destPath}`); return; }`n      if (await objectExists(client, opts.bucket, destPath)) { console.log(`[exists] ${opts.bucket}/${destPath}`); uploadedKeys.add(destPath); return; }"
  return "const onAdd = async (full: string) => {" + $block + "await uploadFile(client, opts.bucket, full, destPath, opts.upsert);"

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
