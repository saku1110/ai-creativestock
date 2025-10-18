#!/usr/bin/env node

// Bulk uploader: sends videos to /api/upload/auto so that the serverless
// handler extracts metadata, generates thumbnails, uploads to Storage, and
// inserts rows into video_assets. Works with hundreds of files using simple
// concurrency.

import fs from 'fs/promises';
import path from 'path';

const DEFAULT_REGEX = '^(?<category>[^_\\-]+)[_\\-]';

function parseArgs(argv) {
  const opts = {
    dir: './uploads/watch',
    baseUrl: 'http://localhost:3000',
    scheme: 'dir', // 'dir' | 'regex'
    regex: DEFAULT_REGEX,
    concurrency: 3,
    dryRun: false,
    ext: '.mp4',
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const v = argv[i + 1];
    switch (a) {
      case '--dir': opts.dir = v; i++; break;
      case '--base-url': opts.baseUrl = v; i++; break;
      case '--scheme': opts.scheme = v; i++; break;
      case '--regex': opts.regex = v; i++; break;
      case '--concurrency': opts.concurrency = Math.max(1, Number(v)); i++; break;
      case '--dry':
      case '--dry-run': opts.dryRun = true; break;
      case '--ext': opts.ext = v.startsWith('.') ? v : `.${v}`; i++; break;
      default: break;
    }
  }
  return opts;
}

async function* walk(root) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(root, e.name);
    if (e.isDirectory()) {
      yield* walk(full);
    } else if (e.isFile()) {
      yield full;
    }
  }
}

function extractCategory(localPath, relPath, scheme, regex) {
  if (scheme === 'dir') {
    const first = relPath.split(/[\\/]/)[0];
    return first || 'lifestyle';
  }
  const base = path.basename(localPath);
  const re = new RegExp(regex || DEFAULT_REGEX);
  const m = re.exec(base);
  if (!m) return 'lifestyle';
  return (m.groups?.category || m[1] || 'lifestyle').trim() || 'lifestyle';
}

async function plan(dir, scheme, regex, ext) {
  const root = path.resolve(dir);
  const tasks = [];
  for await (const full of walk(root)) {
    if (!full.toLowerCase().endsWith(ext.toLowerCase())) continue;
    const rel = path.relative(root, full);
    const category = extractCategory(full, rel, scheme, regex);
    tasks.push({ full, rel, category });
  }
  return { root, tasks };
}

async function uploadOne(baseUrl, task) {
  try {
    const buf = await fs.readFile(task.full);
    const blob = new Blob([buf], { type: 'video/mp4' });
    const form = new FormData();
    form.append('video', blob, path.basename(task.full));
    form.append('category', task.category);
    form.append('title', path.basename(task.full, path.extname(task.full)).replace(/[\-_]/g, ' '));
    form.append('description', `Auto-categorized as ${task.category}`);

    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/upload/auto`, {
      method: 'POST',
      body: form,
      // In dev, API key is optional. In prod, set VITE_UPLOAD_API_KEY and proxy through frontend or set header here.
      headers: { 'X-API-Key': process.env.VITE_UPLOAD_API_KEY || process.env.UPLOAD_API_KEY || '' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || `HTTP ${res.status}`);
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function run() {
  const opts = parseArgs(process.argv);
  const { root, tasks } = await plan(opts.dir, opts.scheme, opts.regex, opts.ext);
  if (tasks.length === 0) {
    console.log('No files found in', root);
    return;
  }
  console.log(`Planned ${tasks.length} uploads from ${root} (scheme=${opts.scheme}, concurrency=${opts.concurrency})`);
  if (opts.dryRun) {
    for (const t of tasks.slice(0, 10)) console.log(`[DRY] ${t.rel} -> category=${t.category}`);
    if (tasks.length > 10) console.log(`... and ${tasks.length - 10} more`);
    return;
  }

  let idx = 0, inflight = 0, ok = 0, fail = 0;
  const next = async () => {
    if (idx >= tasks.length) return;
    const t = tasks[idx++];
    inflight++;
    try {
      const res = await uploadOne(opts.baseUrl, t);
      if (res.ok) {
        ok++;
        console.log(`OK   ${t.rel} [${t.category}]`);
      } else {
        fail++;
        console.warn(`FAIL ${t.rel} [${t.category}] -> ${res.error}`);
      }
    } finally {
      inflight--;
      await next();
    }
  };

  const starters = Array.from({ length: Math.min(opts.concurrency, tasks.length) }, () => next());
  await Promise.all(starters);
  console.log(`Done. success=${ok}, failed=${fail}`);
}

run().catch((e) => {
  console.error('Bulk upload failed', e);
  process.exit(1);
});

