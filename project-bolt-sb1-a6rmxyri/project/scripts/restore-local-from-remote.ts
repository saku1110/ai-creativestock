#!/usr/bin/env tsx
import fs from 'fs/promises';
import path from 'path';
import { remoteManifest } from '../src/local-content/remote-manifest';

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

async function download(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  return buf;
}

async function restore(prefixes: string[]) {
  const projectRoot = process.cwd();
  let ok = 0, fail = 0;
  for (const [key, meta] of Object.entries(remoteManifest)) {
    if (!prefixes.some(pre => key.startsWith(pre + '/'))) continue;
    const out = path.join(projectRoot, 'src', 'local-content', key);
    try {
      await ensureDir(path.dirname(out));
      const buf = await download((meta as any).url);
      await fs.writeFile(out, buf);
      console.log(`[OK] ${key} -> ${path.relative(projectRoot, out)}`);
      ok++;
    } catch (e: any) {
      console.warn(`[FAIL] ${key}: ${e?.message || e}`);
      fail++;
    }
  }
  console.log(`restore done. ok=${ok}, fail=${fail}`);
}

const prefixes = process.argv.slice(2);
if (prefixes.length === 0) {
  prefixes.push('hero', 'lp-grid');
}
restore(prefixes).catch((e) => { console.error('restore error:', e?.message || e); process.exit(1); });

