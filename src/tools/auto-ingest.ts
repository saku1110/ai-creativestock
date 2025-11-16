import 'dotenv/config';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import { createClient } from '@supabase/supabase-js';
import ffmpeg from 'fluent-ffmpeg';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - type defs not required for runtime
import ffmpegPath from 'ffmpeg-static';

type Provider = 'none' | 'rekognition';

interface Options {
  dir: string;
  bucket: string;
  provider: Provider;
  upsert: boolean;
  dryRun: boolean;
}

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    dir: '',
    bucket: '',
    provider: 'none',
    upsert: true,
    dryRun: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const v = argv[i + 1];
    switch (a) {
      case '--dir': opts.dir = v || ''; i++; break;
      case '--bucket': opts.bucket = v || ''; i++; break;
      case '--provider': opts.provider = (v === 'rekognition' ? 'rekognition' : 'none'); i++; break;
      case '--no-upsert': opts.upsert = false; break;
      case '--dry':
      case '--dry-run': opts.dryRun = true; break;
      default: break;
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
    } else if (e.isFile()) {
      const lower = full.toLowerCase();
      if (lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.webm') || lower.endsWith('.avi')) {
        yield full;
      }
    }
  }
}

type VideoMetadata = {
  duration: number;
  resolution: string; // e.g. 1920x1080
  bitrate: number;
  size?: number;
  format: string;
};

type DemoTags = { age?: string; gender?: string; tags: string[] };

const CATEGORY_INFERENCE_MODULE = '../../project-bolt-sb1-a6rmxyri/project/src/utils/categoryInference';

const loadCategoryInferenceModule = async () => {
  try {
    return await import(`${CATEGORY_INFERENCE_MODULE}.js`);
  } catch {
    return import(`${CATEGORY_INFERENCE_MODULE}.ts`);
  }
};

async function extractMetadata(videoPath: string): Promise<VideoMetadata> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ffmpeg as any).setFfmpegPath(ffmpegPath as unknown as string);
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err: Error | null, m: any) => {
      if (err) return reject(err);
      const vs = (m?.streams || []).find((s: any) => s?.codec_type === 'video') as any;
      if (!vs) return reject(new Error('No video stream found'));
      const meta: VideoMetadata = {
        duration: Math.round((m?.format?.duration as number) || 0),
        resolution: `${vs.width}x${vs.height}`,
        bitrate: m?.format?.bit_rate ? parseInt(String(m.format.bit_rate)) : 0,
        format: String(m?.format?.format_name || 'unknown'),
      };
      if (m?.format?.size) {
        meta.size = parseInt(String(m.format.size));
      }
      resolve(meta);
    });
  });
}

async function generateThumbnail(videoPath: string, atSeconds = 2): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ffmpeg as any).setFfmpegPath(ffmpegPath as unknown as string);
  const out = path.join(process.cwd(), 'temp', 'thumbnails', `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);
  await fs.mkdir(path.dirname(out), { recursive: true });
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .seekInput(Math.max(0, atSeconds))
      .frames(1)
      .output(out)
      .size('720x1280')
      .on('end', () => resolve(out))
      .on('error', reject)
      .run();
  });
}

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

// Light-weight import from project util (fallback if missing)
type VideoCategory = 'beauty' | 'fitness' | 'haircare' | 'business' | 'lifestyle';
async function inferCategoryFromNameOrPath(filePath: string): Promise<VideoCategory> {
  try {
    const mod = await loadCategoryInferenceModule();
    const { inferCategoryFromFilename } = mod as any;
    const res = inferCategoryFromFilename(path.basename(filePath), { filePath, fallback: 'lifestyle' });
    return res?.category ?? 'lifestyle';
  } catch {
    const base = path.basename(filePath).toLowerCase();
    if (/hair|salon/.test(base)) return 'haircare';
    if (/fit|workout|gym/.test(base)) return 'fitness';
    if (/beauty|makeup|cosme|skin/.test(base)) return 'beauty';
    if (/business|office|meeting/.test(base)) return 'business';
    return 'lifestyle';
  }
}

async function inferBeautySubTags(filePath: string): Promise<string[]> {
  try {
    const mod = await loadCategoryInferenceModule();
    const { inferCategoryFromFilename, resolveBeautySubCategory } = mod as any;
    const res = inferCategoryFromFilename(path.basename(filePath), { filePath, fallback: 'lifestyle' });
    if (res?.category !== 'beauty') return [];
    const tokens = (res?.keywords || []) as string[];
    const hints = (filePath || '').toLowerCase().split(/[\\/._-]+/);
    const r = resolveBeautySubCategory({ tokens, pathHints: hints, keywords: tokens });
    const sub = r?.subCategory as 'skincare' | 'haircare' | 'oralcare' | undefined;
    if (!sub) return [];
    const labelMap: Record<'skincare' | 'haircare' | 'oralcare', string> = {
      skincare: 'スキンケア',
      haircare: 'ヘアケア',
      oralcare: 'オーラルケア'
    };
    return [`beauty:${sub}`, labelMap[sub]];
  } catch {
    return [];
  }
}

type RekognitionAttributes = {
  ageRange?: { low: number; high: number };
  gender?: 'Male' | 'Female';
  labels?: string[];
  facesCount?: number;
};

async function detectWithRekognition(thumbnailPath: string): Promise<RekognitionAttributes> {
  try {
    const { RekognitionClient, DetectFacesCommand, DetectLabelsCommand } = await import('@aws-sdk/client-rekognition');
    const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
    const client = new RekognitionClient({ region });
    const bytes = await fs.readFile(thumbnailPath);

    const [facesRes, labelsRes] = await Promise.all([
      client.send(new DetectFacesCommand({ Image: { Bytes: bytes }, Attributes: ['ALL'] })) as Promise<any>,
      client.send(new DetectLabelsCommand({ Image: { Bytes: bytes }, MaxLabels: 20, MinConfidence: 75 })) as Promise<any>
    ]);

    let ageRange: { low: number; high: number } | undefined;
    let gender: 'Male' | 'Female' | undefined;
    const labels = (labelsRes?.Labels || []).map((l: any) => String(l?.Name)).filter(Boolean);

    const faceCount = facesRes?.FaceDetails?.length || 0;
    if (faceCount > 0) {
      // choose the face with largest bounding box area
      const sorted = [...(facesRes?.FaceDetails || [])].sort((a: any, b: any) => {
        const areaA = (a.BoundingBox?.Width || 0) * (a.BoundingBox?.Height || 0);
        const areaB = (b.BoundingBox?.Width || 0) * (b.BoundingBox?.Height || 0);
        return areaB - areaA;
      });
      const best = sorted[0] as any;
      if (best?.AgeRange) ageRange = { low: best.AgeRange.Low, high: best.AgeRange.High };
      const g = best?.Gender?.Value;
      if (g === 'Male' || g === 'Female') gender = g;
    }

    const result: RekognitionAttributes = {
      labels,
      facesCount: faceCount
    };
    if (ageRange) result.ageRange = ageRange;
    if (gender) result.gender = gender;
    return result;
  } catch (e) {
    console.warn('[rekognition] skipped or failed:', (e as any)?.message || e);
    return {};
  }
}

function mapAgeToUiJapanese(avg: number): string | undefined {
  if (avg >= 50) return '50代';
  if (avg >= 40) return '40代';
  if (avg >= 30) return '30代';
  if (avg >= 20) return '20代';
  if (avg >= 13) return '10代';
  return undefined; // 子供はUIに明示カテゴリがないため除外
}

function deriveDemographics(attrs: RekognitionAttributes): DemoTags {
  const tags: string[] = [];
  let inferredAge: string | undefined;
  let inferredGender: string | undefined;

  if (attrs.ageRange) {
    const avg = Math.round((attrs.ageRange.low + attrs.ageRange.high) / 2);
    if (avg < 13) inferredAge = 'child';
    else if (avg < 20) inferredAge = 'teen';
    else if (avg < 35) inferredAge = 'young-adult';
    else if (avg < 60) inferredAge = 'adult';
    else inferredAge = 'senior';
    // English canonical tag
    tags.push(inferredAge);
    // Japanese UI-friendly decade tag
    const ja = mapAgeToUiJapanese(avg);
    if (ja) tags.push(ja);
  }
  if (attrs.gender) {
    inferredGender = attrs.gender.toLowerCase();
    tags.push(inferredGender);
    // Japanese synonym for UI filter
    if (inferredGender === 'male') tags.push('男性');
    if (inferredGender === 'female') tags.push('女性');
  }
  if (attrs.labels && attrs.labels.length) {
    tags.push(...attrs.labels.slice(0, 10).map((s) => s.toLowerCase().replace(/\s+/g, '-')));
  }
  if ((attrs.facesCount || 0) >= 2) {
    // couple/mixed presence
    tags.push('mixed', '男女');
  }
  const uniqueTags = Array.from(new Set(tags)).slice(0, 15);
  const result: DemoTags = { tags: uniqueTags };
  if (inferredAge) result.age = inferredAge;
  if (inferredGender) result.gender = inferredGender;
  return result;
}

async function main() {
  const opts = parseArgs(process.argv);

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Ensure bucket exists (public) for simple public URL serving
  try {
    const storageApi = supabase.storage as Record<string, any>;
    const { data: buckets } = await storageApi.listBuckets?.();
    const exists = Array.isArray(buckets) && buckets.some((b: any) => b.name === opts.bucket);
    if (!exists) {
      await storageApi.createBucket?.(opts.bucket, { public: true });
      console.log(`[ingest] created bucket ${opts.bucket} (public)`);
    }
  } catch (e) {
    console.warn('[ingest] bucket ensure skipped:', (e as any)?.message || e);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ffmpeg as any).setFfmpegPath(ffmpegPath as unknown as string);

  console.log(`[ingest] scanning ${opts.dir} -> bucket=${opts.bucket} provider=${opts.provider}`);

  for await (const videoPath of walk(opts.dir)) {
    const rel = path.relative(opts.dir, videoPath);
    try {
      const meta = await extractMetadata(videoPath);
      const thumbPath = await generateThumbnail(videoPath, Math.min(3, Math.max(1, Math.floor(meta.duration / 3))));

      let demoTags: DemoTags = { tags: [] };
      if (opts.provider === 'rekognition') {
        const attrs = await detectWithRekognition(thumbPath);
        demoTags = deriveDemographics(attrs);
      }

      const baseName = path.basename(videoPath);
      const safeBase = sanitizeBasename(baseName);
      const category = await inferCategoryFromNameOrPath(videoPath);
      const videoKey = `videos/${category}/${safeBase}`;
      const thumbKey = `thumbnails/${category}/${safeBase.replace(/\.[^.]+$/, '')}.jpg`;

      const [rawW = 0, rawH = 0] = meta.resolution.split('x').map(Number);
      const w = Number.isFinite(rawW) ? rawW : 0;
      const h = Number.isFinite(rawH) ? rawH : 0;
      const ratio = w > 0 && h > 0 ? w / h : 0;
      const ratioTag =
        ratio === 0
          ? undefined
          : Math.abs(ratio - 9 / 16) < 0.1
          ? '9:16'
          : Math.abs(ratio - 16 / 9) < 0.1
          ? '16:9'
          : Math.abs(ratio - 1) < 0.1
          ? '1:1'
          : undefined;

      const beautyTags = category === 'beauty' ? await inferBeautySubTags(videoPath) : [];
      const tags = Array.from(new Set([
        category,
        ratioTag,
        meta.duration ? `${meta.duration}s` : undefined,
        w >= 3840 ? '4k' : w >= 1920 ? 'full-hd' : w >= 1280 ? 'hd' : undefined,
        ...demoTags.tags,
        ...beautyTags,
      ].filter(Boolean) as string[])).slice(0, 20);

      console.log(`[plan] ${rel} -> ${videoKey}`);
      if (opts.dryRun) {
        await fs.unlink(thumbPath).catch(() => {});
        continue;
      }

      // Upload video
      const vStream = createReadStream(videoPath);
      const { error: vErr } = await supabase.storage.from(opts.bucket).upload(videoKey, vStream as any, {
        upsert: opts.upsert,
        contentType: 'video/mp4',
      } as any);
      if (vErr) throw new Error(`upload video failed: ${vErr.message}`);

      // Upload thumbnail
      const tBuf = await fs.readFile(thumbPath);
      const { error: tErr } = await supabase.storage.from(opts.bucket).upload(thumbKey, tBuf as any, {
        upsert: true,
        contentType: 'image/jpeg',
      } as any);
      if (tErr) throw new Error(`upload thumbnail failed: ${tErr.message}`);

      const { data: { publicUrl: videoUrl } } = supabase.storage.from(opts.bucket).getPublicUrl(videoKey);
      const { data: { publicUrl: thumbnailUrl } } = supabase.storage.from(opts.bucket).getPublicUrl(thumbKey);

      const title = path.basename(baseName, path.extname(baseName)).replace(/[-_]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

      const { error: dbError } = await supabase
        .from('video_assets')
        .insert([{ 
          title,
          description: `Auto-tagged: ${tags.join(', ')}`,
          category,
          tags,
          duration: meta.duration,
          resolution: meta.resolution,
          file_url: videoUrl,
          thumbnail_url: thumbnailUrl,
          is_featured: false,
          download_count: 0,
          created_at: new Date().toISOString(),
          // Optionally store demographics as part of tags or custom fields if schema allows
        }]);

      if (dbError) throw new Error(`db insert failed: ${dbError.message}`);

      console.log(`[ok] ${rel}`);

      await fs.unlink(thumbPath).catch(() => {});
    } catch (e: any) {
      console.warn(`[fail] ${rel}: ${e?.message || e}`);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('auto-ingest.ts')) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main();
}
