#!/usr/bin/env tsx

/**
 * Uploads watermarked videos for a given local-content subfolder (e.g. hero, lp-grid)
 * to Supabase Storage after clearing existing objects under that prefix.
 *
 * Usage:
 *   npx tsx scripts/upload-watermarked-folder.ts hero
 *   npx tsx scripts/upload-watermarked-folder.ts lp-grid
 *
 * Env vars (read via .env):
 *  - SUPABASE_URL (required)
 *  - SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY (required)
 *  - SUPABASE_STORAGE_BUCKET (optional, default: local-content)
 */

import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

loadEnv();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'local-content';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SERVICE_KEY are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

type ManifestEntry = {
  url: string;
  path: string;
  uploadedAt: string;
  size: number;
  mimeType: string;
};

const projectRoot = process.cwd();
const localRoot = path.resolve(projectRoot, 'src', 'local-content');
const manifestPath = path.resolve(localRoot, 'remote-manifest.ts');

function sanitizeBasename(name: string): string {
  const idx = name.lastIndexOf('.');
  const base = idx >= 0 ? name.slice(0, idx) : name;
  const ext = idx >= 0 ? name.slice(idx) : '';
  let safe = base
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '');
  if (!safe) safe = `file-${Date.now()}`;
  if (safe.length > 120) safe = safe.slice(0, 120);
  return `${safe}${ext}`;
}

async function listObjects(prefix: string): Promise<string[]> {
  const all: string[] = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit, offset });
    if (error) throw error;
    const items = data || [];
    all.push(...items.filter(i => i.name).map(i => `${prefix}/${i.name}`));
    if (items.length < limit) break;
    offset += items.length;
  }
  return all;
}

async function loadExistingManifest(): Promise<Record<string, ManifestEntry>> {
  try {
    const mod = await import(path.toNamespacedPath(path.resolve(localRoot, 'remote-manifest.ts')));
    const existing = (mod.remoteManifest || {}) as Record<string, ManifestEntry>;
    return { ...existing };
  } catch {
    return {};
  }
}

async function main() {
  const folder = (process.argv[2] || '').trim();
  if (!folder) {
    console.error('Usage: tsx scripts/upload-watermarked-folder.ts <subfolder>');
    process.exit(1);
  }

  const dir = path.resolve(localRoot, folder);
  const stat = await fs.stat(dir).catch(() => null);
  if (!stat || !stat.isDirectory()) {
    console.error(`Folder not found: ${dir}`);
    process.exit(1);
  }

  // Collect local watermarked files (finalized suffix)
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const localFiles = entries
    .filter(e => e.isFile() && /-wm-alpha200\.(mp4|webm|mov)$/i.test(e.name))
    .map(e => path.join(dir, e.name));

  if (localFiles.length === 0) {
    console.log(`No watermarked files (*-wm-alpha200.*) found under ${folder}.`);
    return;
  }

  // Clear remote prefix
  const existing = await listObjects(folder).catch(() => [] as string[]);
  if (existing.length > 0) {
    console.log(`Deleting ${existing.length} existing objects from ${bucket}/${folder} ...`);
    const chunkSize = 1000;
    for (let i = 0; i < existing.length; i += chunkSize) {
      const chunk = existing.slice(i, i + chunkSize);
      const { error } = await supabase.storage.from(bucket).remove(chunk);
      if (error) throw error;
    }
  } else {
    console.log(`No existing objects under ${folder}/ to delete.`);
  }

  // Load/merge manifest
  const manifest: Record<string, ManifestEntry> = await loadExistingManifest();

  // Upload
  for (const full of localFiles) {
    const base = path.basename(full);
    const storageBase = sanitizeBasename(base);
    const storagePath = `${folder}/${storageBase}`;
    const buf = await fs.readFile(full);
    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(storagePath, buf, { upsert: true, contentType: 'video/mp4' });
    if (upErr) {
      console.error(`Failed to upload ${base}:`, upErr.message);
      continue;
    }
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    const url = pub?.publicUrl || '';
    manifest[`${folder}/${base}`] = {
      url,
      path: storagePath,
      uploadedAt: new Date().toISOString(),
      size: buf.byteLength,
      mimeType: 'video/mp4'
    };
    console.log(`Uploaded ${base}`);
  }

  // Write manifest
  const header = `/**\n * This file is auto-generated by scripts/upload-watermarked-folder.ts\n * Do not edit manually.\n */\n\nexport const remoteManifest = ${JSON.stringify(manifest, null, 2)} as const;\n\nexport type RemoteManifest = typeof remoteManifest;\nexport type RemoteManifestEntry = RemoteManifest[keyof RemoteManifest];\n`;
  await fs.writeFile(manifestPath, header, 'utf8');
  console.log(`Manifest updated at ${path.relative(projectRoot, manifestPath)}`);
}

main().catch((err) => {
  console.error('Upload script failed:', err);
  process.exit(1);
});

