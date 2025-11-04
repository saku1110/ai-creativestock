#!/usr/bin/env tsx

/**
 * Uploads files under src/local-content to Supabase Storage and generates a manifest
 * that maps the relative path (e.g. `hero/sample.mp4`) to the public URL.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run upload:local-content
 *
 * Environment variables:
 *   SUPABASE_URL (required)
 *   SUPABASE_SERVICE_ROLE_KEY (required)
 *   SUPABASE_STORAGE_BUCKET (optional, default: local-content)
 *   SUPABASE_STORAGE_PREFIX (optional, default: local-content)
 */

import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import process from 'process';

const SUPPORTED_EXTENSIONS = new Set(['.mp4', '.webm', '.mov']);

const getMimeType = (ext: string): string => {
  switch (ext.toLowerCase()) {
    case '.mp4':
      return 'video/mp4';
    case '.webm':
      return 'video/webm';
    case '.mov':
      return 'video/quicktime';
    default:
      return 'application/octet-stream';
  }
};

type ManifestEntry = {
  url: string;
  path: string;
  uploadedAt: string;
  size: number;
  mimeType: string;
};

const readFileBuffer = async (fullPath: string) => {
  return fs.readFile(fullPath);
};

const walk = async (root: string): Promise<string[]> => {
  const stack = [root];
  const files: string[] = [];
  while (stack.length > 0) {
    const current = stack.pop()!;
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolute);
      } else if (entry.isFile()) {
        files.push(absolute);
      }
    }
  }
  return files;
};

const sanitizeBasename = (name: string): string => {
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
};

const main = async () => {
  loadEnv();

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'local-content';
  const rawPrefix = process.env.SUPABASE_STORAGE_PREFIX;
  // Normalize default: when bucket=local-content and prefix is unset or 'local-content', do not nest under 'local-content/local-content/...'
  const prefix = (!rawPrefix || (rawPrefix === 'local-content' && bucket === 'local-content')) ? '' : rawPrefix;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❁ESUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false
    }
  });

  const projectRoot = process.cwd();
  const localRoot = path.resolve(projectRoot, 'src', 'local-content');
  const manifestPath = path.resolve(localRoot, 'remote-manifest.ts');

  const absoluteFiles = await walk(localRoot);
  const filtered = absoluteFiles.filter((full) => SUPPORTED_EXTENSIONS.has(path.extname(full).toLowerCase()));

  if (filtered.length === 0) {
    console.log('ℹ�E�E No supported video files found under src/local-content.');
    return;
  }

  const argConcurrency = Number((process.argv.find(a => a === '--concurrency') ? process.argv[process.argv.indexOf('--concurrency') + 1] : '') || '') || 0;
  const envConcurrency = Number(process.env.UPLOAD_CONCURRENCY || '') || 0;
  const concurrency = Math.max(1, argConcurrency || envConcurrency || 6);

  console.log(`📦 Found ${filtered.length} media files. Uploading to bucket "${bucket}" (prefix="${prefix || '(root)'}") with concurrency=${concurrency}.`);

  const manifest: Record<string, ManifestEntry> = {};
  let success = 0;
  let failed = 0;

  let index = 0;
  const lock = new Intl.DateTimeFormat(); // cheap object to prevent tree-shake; not used

  const uploadOne = async (absolute: string) => {
    const relative = path.relative(localRoot, absolute).replace(/\\/g, '/');
    const relDir = relative.includes('/') ? relative.split('/').slice(0, -1).join('/') : '';
    const relBase = relative.split('/').pop() || relative;
    const safeBase = sanitizeBasename(relBase);
    const storagePath = [prefix, relDir, safeBase].filter(Boolean).join('/' );
    const ext = path.extname(absolute);
    const mimeType = getMimeType(ext);
    try {
      const buffer = await readFileBuffer(absolute);
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(storagePath, buffer, { upsert: true, contentType: mimeType });
      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
      if (!publicData?.publicUrl) throw new Error('Public URL could not be resolved. Ensure the bucket is public.');

      success++;
      manifest[relative] = {
        url: publicData.publicUrl,
        path: storagePath,
        uploadedAt: new Date().toISOString(),
        size: buffer.byteLength,
        mimeType
      };
      console.log(`✁EUploaded ${relative}`);
    } catch (error) {
      failed++;
      console.error(`❁EFailed to upload ${relative}:`, error instanceof Error ? error.message : error);
    }
  };

  const runners = Array.from({ length: Math.min(concurrency, filtered.length) }, async () => {
    while (true) {
      const i = index++;
      if (i >= filtered.length) break;
      await uploadOne(filtered[i]);
    }
  });

  await Promise.all(runners);

  if (success === 0) {
    console.warn('⚠�E�E No files were uploaded successfully. Manifest will not be updated.');
    process.exit(failed > 0 ? 1 : 0);
  }

  const header = `/**
 * This file is auto-generated by scripts/upload-local-content.ts
 * Do not edit manually.
 */

export const remoteManifest = ${JSON.stringify(manifest, null, 2)} as const;

export type RemoteManifest = typeof remoteManifest;
export type RemoteManifestEntry = RemoteManifest[keyof RemoteManifest];
`;

  await fs.writeFile(manifestPath, header, 'utf8');
  console.log(`📝 Manifest updated at ${path.relative(projectRoot, manifestPath)}`);
  console.log(`Summary: success=${success}, failed=${failed}`);
};

main().catch((error) => {
  console.error('Unexpected error during upload:', error);
  process.exit(1);
});
