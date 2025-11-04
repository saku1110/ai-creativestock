#!/usr/bin/env tsx

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { spawn } from 'node:child_process';

type Options = {
  bucket: string;
  prefix: string;
  image: string;
  opacity: number;
  concurrency: number;
  overwrite: boolean;
  dryRun: boolean;
  compat: boolean;
  crf?: number;
};

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    bucket: 'local-content',
    prefix: '',
    image: process.env.WATERMARK_IMAGE_PATH || '',
    opacity: Number(process.env.WATERMARK_IMAGE_OPACITY || '0.85'),
    concurrency: Number(process.env.WATERMARK_CONCURRENCY || '4') || 4,
    overwrite: true,
    dryRun: false,
    compat: true,
    crf: Number(process.env.WATERMARK_CRF || '22') || 22,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const v = argv[i + 1];
    switch (a) {
      case '--bucket': opts.bucket = v || opts.bucket; i++; break;
      case '--prefix': opts.prefix = v || opts.prefix; i++; break;
      case '--image': opts.image = v || opts.image; i++; break;
      case '--opacity': opts.opacity = Math.max(0, Math.min(1, Number(v || opts.opacity))); i++; break;
      case '--concurrency': opts.concurrency = Math.max(1, Number(v || opts.concurrency)); i++; break;
      case '--no-overwrite': opts.overwrite = false; break;
      case '--dry':
      case '--dry-run': opts.dryRun = true; break;
      case '--compat': opts.compat = true; break;
      case '--no-compat': opts.compat = false; break;
      case '--crf': opts.crf = Math.max(16, Math.min(30, Number(v || opts.crf))); i++; break;
      default: break;
    }
  }
  if (!opts.image) throw new Error('Watermark image is required. Pass --image or set WATERMARK_IMAGE_PATH');
  return opts;
}

async function listVideos(client: any, bucket: string, prefix: string): Promise<string[]> {
  const out: string[] = [];
  const { data, error } = await client.storage.from(bucket).list(prefix, { limit: 1000, sortBy: { column: 'name', order: 'asc' } } as any);
  if (error) throw new Error(error.message);
  for (const f of data || []) {
    const name = (f as any).name as string | undefined;
    if (!name) continue;
    if (/\.(mp4|mov|webm|avi|mkv)$/i.test(name)) {
      out.push(prefix ? `${prefix.replace(/\/$/, '')}/${name}` : name);
    }
  }
  return out;
}

async function downloadToTemp(client: any, bucket: string, key: string): Promise<string> {
  const { data, error } = await client.storage.from(bucket).createSignedUrl(key, 600);
  if (error || !data?.signedUrl) throw new Error(error?.message || 'failed to sign');
  const res = await fetch(data.signedUrl);
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  const tmp = path.join(os.tmpdir(), `wm-${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(key)}`);
  await fs.writeFile(tmp, buf);
  return tmp;
}

function contentTypeForExt(ext: string): string {
  const e = ext.toLowerCase();
  if (e === '.mp4') return 'video/mp4';
  if (e === '.mov') return 'video/quicktime';
  if (e === '.webm') return 'video/webm';
  if (e === '.avi') return 'video/x-msvideo';
  if (e === '.mkv') return 'video/x-matroska';
  return 'application/octet-stream';
}

async function processOne(client: any, opts: Options, key: string): Promise<{ ok: boolean; target: string; error?: string }> {
  try {
    const src = await downloadToTemp(client, opts.bucket, key);
    const out = path.join(os.tmpdir(), `wmo-${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(key)}`);
    // Try to resolve ffmpeg-static from project submodule if available
    let ffmpegBin: string | undefined;
    try {
      ffmpegBin = (await import('../../project-bolt-sb1-a6rmxyri/project/node_modules/ffmpeg-static')).default as unknown as string;
    } catch {
      // fallback to system ffmpeg
      ffmpegBin = 'ffmpeg';
    }
    const filter = `[1:v][0:v]scale2ref=w=iw:h=ih[wm][vid];` +
                   `[vid][wm]overlay=0:0:format=auto:alpha=${opts.opacity}[ov];` +
                   `[ov]scale=trunc(iw/2)*2:trunc(ih/2)*2[out]`;
    const args: string[] = ['-i', src, '-i', opts.image, '-filter_complex', filter];
    if (opts.compat) {
      args.push(
        '-map','[out]','-map','0:a?',
        '-c:v','libx264','-crf', String(opts.crf ?? 22),
        '-preset','veryfast','-pix_fmt','yuv420p','-movflags','+faststart',
        '-c:a','aac','-b:a','128k'
      );
    } else {
      args.push('-map','[out]','-codec:a','copy');
    }
    args.push('-y', out);
    await new Promise<void>((resolve, reject) => {
      const p = spawn(ffmpegBin!, args, { stdio: 'ignore' });
      p.on('error', reject);
      p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with code ${code}`))));
    });
    const target = opts.overwrite ? key : key.replace(/\.[^.]+$/, (m) => `-wm${m}`);
    if (!opts.dryRun) {
      const buf = await fs.readFile(out);
      const { error: upErr } = await client.storage
        .from(opts.bucket)
        .upload(target, buf as any, { upsert: true, contentType: contentTypeForExt(path.extname(key)) } as any);
      if (upErr) throw new Error(upErr.message);
    }
    await fs.unlink(src).catch(() => {});
    await fs.unlink(out).catch(() => {});
    return { ok: true, target };
  } catch (e: any) {
    return { ok: false, target: key, error: e?.message || String(e) };
  }
}

async function main() {
  const opts = parseArgs(process.argv);
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Missing SUPABASE_URL or SERVICE key');
  const client = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const keys = await listVideos(client, opts.bucket, opts.prefix);
  if (keys.length === 0) {
    console.log(`[retro-wm] no videos in ${opts.bucket}/${opts.prefix}`);
    return;
  }
  console.log(`[retro-wm] planning ${keys.length} videos (concurrency=${opts.concurrency}) overwrite=${opts.overwrite}`);
  if (opts.dryRun) {
    keys.slice(0, 10).forEach((k) => console.log(`[DRY] ${k}`));
    if (keys.length > 10) console.log(`... and ${keys.length - 10} more`);
    return;
  }

  let idx = 0, ok = 0, fail = 0;
  const next = async (): Promise<void> => {
    const i = idx++;
    if (i >= keys.length) return;
    const key = keys[i];
    const r = await processOne(client, opts, key);
    if (r.ok) { ok++; console.log(`[OK] ${r.target}`); } else { fail++; console.warn(`[FAIL] ${r.target}: ${r.error}`); }
    await next();
  };

  await Promise.all(Array.from({ length: Math.min(opts.concurrency, keys.length) }, () => next()));
  console.log(`[retro-wm] done. success=${ok}, failed=${fail}`);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('retro-watermark.ts')) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main();
}



