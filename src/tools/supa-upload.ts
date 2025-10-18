import 'dotenv/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createReadStream } from 'fs';
import fs from 'fs/promises';
import path from 'path';

type Scheme = 'dir' | 'regex';

interface Options {
  dir: string;
  bucket: string;
  scheme: Scheme;
  regex?: string;
  concurrency: number;
  dryRun: boolean;
  upsert: boolean;
}

interface UploadTask {
  localPath: string;
  relPath: string;
  category: string;
  destPath: string; // <category>/<filename>
}

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    dir: '',
    bucket: '',
    scheme: 'regex',
    regex: '^(?<category>[^_\-]+)[_\-]',
    concurrency: 4,
    dryRun: false,
    upsert: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const v = argv[i + 1];
    switch (a) {
      case '--dir':
        if (!v) throw new Error('--dir is required');
        opts.dir = v; i++; break;
      case '--bucket':
        if (!v) throw new Error('--bucket is required');
        opts.bucket = v; i++; break;
      case '--scheme':
        if (!v || (v !== 'dir' && v !== 'regex')) throw new Error('--scheme must be dir|regex');
        opts.scheme = v as Scheme; i++; break;
      case '--regex':
        if (!v) throw new Error('--regex requires a value');
        opts.regex = v; i++; break;
      case '--concurrency':
        if (!v) throw new Error('--concurrency requires a value');
        opts.concurrency = Math.max(1, Number(v)); i++; break;
      case '--dry-run':
      case '--dry':
        opts.dryRun = true; break;
      case '--upsert':
        opts.upsert = true; break;
      default:
        // ignore unknown
        break;
    }
  }
  if (!opts.dir) throw new Error('--dir is required');
  if (!opts.bucket) throw new Error('--bucket is required');
  return opts;
}

async function* walk(root: string): AsyncGenerator<string> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(root, e.name);
    if (e.isDirectory()) {
      yield* walk(full);
    } else if (e.isFile() && full.toLowerCase().endsWith('.mp4')) {
      yield full;
    }
  }
}

export function extractCategory(filename: string, relPath: string, scheme: Scheme, regex?: string): string {
  if (scheme === 'dir') {
    const first = relPath.split(/[\\/]/)[0];
    return first || 'uncategorized';
  }
  const base = path.basename(filename);
  const pattern = regex ?? '^(?<category>[^_\-]+)[_\-]';
  const re = new RegExp(pattern);
  const m = re.exec(base);
  if (!m) return 'uncategorized';
  const cat = (m.groups?.category ?? m[1] ?? '').trim();
  return cat || 'uncategorized';
}

async function planTasks(root: string, scheme: Scheme, regex: string): Promise<UploadTask[]> {
  const tasks: UploadTask[] = [];
  for await (const full of walk(root)) {
    const rel = path.relative(root, full);
    const category = extractCategory(full, rel, scheme, regex);
    const destPath = path.posix.join(category, path.basename(full));
    tasks.push({ localPath: full, relPath: rel, category, destPath });
  }
  return tasks;
}

async function existsObject(client: SupabaseClient, bucket: string, destPath: string): Promise<boolean> {
  const prefix = path.posix.dirname(destPath);
  const name = path.posix.basename(destPath);
  const { data, error } = await client.storage.from(bucket).list(prefix === '.' ? '' : prefix, { search: name, limit: 100 });
  if (error) return false; // treat unknown as not found
  return (data ?? []).some((d) => d.name === name);
}

async function uploadOne(client: SupabaseClient, bucket: string, task: UploadTask, upsert: boolean): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!upsert) {
      const already = await existsObject(client, bucket, task.destPath);
      if (already) return { ok: true };
    }
    const { data, error } = await client.storage.from(bucket).createSignedUploadUrl(task.destPath);
    if (error || !data) return { ok: false, error: error?.message || 'failed to create signed upload url' };
    const stream = createReadStream(task.localPath);
    const { error: upErr } = await client.storage.from(bucket).uploadToSignedUrl(task.destPath, data.token, stream as unknown as Blob, {
      contentType: 'video/mp4',
      upsert,
    } as any);
    if (upErr) return { ok: false, error: upErr.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

async function main() {
  const opts = parseArgs(process.argv);

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/ANON env vars');
    process.exit(1);
  }
  const client = createClient(SUPABASE_URL, SUPABASE_KEY);

  const root = path.resolve(opts.dir);
  const tasks = await planTasks(root, opts.scheme, opts.regex || '');
  if (tasks.length === 0) {
    console.log('No mp4 files found in', root);
    return;
  }

  console.log(`Planned ${tasks.length} uploads (concurrency=${opts.concurrency})`);
  if (opts.dryRun) {
    for (const t of tasks.slice(0, 10)) {
      console.log(`[DRY] ${t.relPath} -> ${opts.bucket}/${t.destPath}`);
    }
    if (tasks.length > 10) console.log(`... and ${tasks.length - 10} more`);
    return;
  }

  // Simple concurrency control
  let inFlight = 0;
  let idx = 0;
  let ok = 0, fail = 0, skipped = 0;
  const next = async (): Promise<void> => {
    if (idx >= tasks.length) return;
    const current = tasks[idx]!; // safe due to guard above
    idx++;
    inFlight++;
    try {
      const res = await uploadOne(client, opts.bucket, current, opts.upsert);
      if (res.ok) {
        ok++;
        console.log(`OK   ${current.relPath} -> ${current.destPath}`);
      } else if (res.error === undefined) {
        skipped++;
        console.log(`SKIP ${current.relPath}`);
      } else {
        fail++;
        console.warn(`FAIL ${current.relPath}: ${res.error}`);
      }
    } finally {
      inFlight--;
      await next();
    }
  };

  const starters = Array.from({ length: Math.min(opts.concurrency, tasks.length) }, () => next());
  await Promise.all(starters);

  console.log(`Done. success=${ok}, failed=${fail}, skipped=${skipped}`);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('supa-upload.ts')) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main();
}
