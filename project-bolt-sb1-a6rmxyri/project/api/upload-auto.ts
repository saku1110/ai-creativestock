import type { VercelRequest, VercelResponse } from '@vercel/node';
import formidable from 'formidable';
import fs from 'fs/promises';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
// @ts-ignore - type defs not required for runtime
import ffmpegPath from 'ffmpeg-static';
import { supabaseAdmin } from './_supabaseAdmin.js';
import { inferCategoryFromFilename, isVideoCategory, type VideoCategory } from '../src/utils/categoryInference.js';

// CORS: 許可オリジンを環境変数で制御（未設定時は閉じすぎないが、可能なら必ず設定）
const ALLOWED_ORIGIN = process.env.UPLOAD_ALLOWED_ORIGIN || '';
const API_KEY = process.env.UPLOAD_API_KEY || '';
const IS_DEV = (process.env.VERCEL_ENV !== 'production') && (process.env.NODE_ENV !== 'production');

function setCors(res: VercelResponse, origin?: string) {
  const allowOrigin = ALLOWED_ORIGIN || origin || '*';
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res, req.headers.origin as string | undefined);
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // APIキー検証（本番のみ必須）
  if (!IS_DEV) {
    if (!API_KEY || req.headers['x-api-key'] !== API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    // ffmpeg path setup (for serverless)
    if (ffmpegPath) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ffmpeg as any).setFfmpegPath(ffmpegPath as unknown as string);
    }

    // Parse multipart form data
    const form = formidable({
      maxFileSize: 100 * 1024 * 1024, // 100MB
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    
    const videoFile = Array.isArray(files.video) ? files.video[0] : files.video;
    if (!videoFile) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    // Extract metadata and basic validation
    const metadata = await extractMetadata(videoFile.filepath);
    const validationErrors = validateMetadata(metadata);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Video validation failed',
        details: validationErrors
      });
    }
    
    const categoryFieldRaw = (Array.isArray(fields.category) ? fields.category[0] : fields.category) as string | undefined;
    let normalizedCategory: VideoCategory | undefined;
    if (categoryFieldRaw && isVideoCategory(categoryFieldRaw)) {
      normalizedCategory = categoryFieldRaw.toLowerCase() as VideoCategory;
    }
    const fallbackCategory: VideoCategory = normalizedCategory ?? 'lifestyle';
    const filenameClassification = inferCategoryFromFilename(
      videoFile.originalFilename || videoFile.newFilename || videoFile.filepath,
      {
        fallback: fallbackCategory,
        filePath: videoFile.filepath
      }
    );
    const classification = normalizedCategory
      ? {
          ...filenameClassification,
          category: normalizedCategory,
          confidence: 1,
          source: 'manual' as const
        }
      : filenameClassification;

    // Generate thumbnail
    const thumbnailPath = await generateThumbnail(videoFile.filepath);
    
    // Generate simple tags
    const tags = generateTags(metadata, classification);

    // Read files as buffers
    const videoBuffer = await fs.readFile(videoFile.filepath);
    const thumbnailBuffer = await fs.readFile(thumbnailPath);

    // Upload video to Supabase Storage (Admin client)
    const videoFileName = `${Date.now()}_${videoFile.originalFilename}`;
    const { data: videoData, error: videoError } = await supabaseAdmin.storage
      .from('video-assets')
      .upload(`videos/${videoFileName}`, videoBuffer, {
        contentType: 'video/mp4',
      });

    if (videoError) {
      throw new Error(`Failed to upload video: ${videoError.message}`);
    }

    // Upload thumbnail to Supabase Storage (Admin client)
    const thumbnailFileName = `${Date.now()}_thumbnail.jpg`;
    const { data: thumbnailData, error: thumbnailError } = await supabaseAdmin.storage
      .from('video-assets')
      .upload(`thumbnails/${thumbnailFileName}`, thumbnailBuffer, {
        contentType: 'image/jpeg',
      });

    if (thumbnailError) {
      throw new Error(`Failed to upload thumbnail: ${thumbnailError.message}`);
    }

    // Get public URLs
    const { data: { publicUrl: videoUrl } } = supabaseAdmin.storage
      .from('video-assets')
      .getPublicUrl(`videos/${videoFileName}`);

    const { data: { publicUrl: thumbnailUrl } } = supabaseAdmin.storage
      .from('video-assets')
      .getPublicUrl(`thumbnails/${thumbnailFileName}`);

    // Save to database
    const title = fields.title?.[0] || 
      path.basename(videoFile.originalFilename || 'Untitled', path.extname(videoFile.originalFilename || ''))
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());

    const { data: assetData, error: dbError } = await supabaseAdmin
      .from('video_assets')
      .insert([{
        title,
        description: fields.description?.[0] || `Auto-categorized as ${classification.category}`,
        category: fields.category?.[0] || classification.category,
        tags,
        duration: metadata.duration,
        resolution: metadata.resolution,
        file_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        is_featured: false,
        download_count: 0,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (dbError) {
      throw new Error(`Failed to save to database: ${dbError.message}`);
    }

    // Clean up temporary files
    await fs.unlink(videoFile.filepath).catch(() => {});
    await fs.unlink(thumbnailPath).catch(() => {});

    // Return success response
    return res.status(200).json({
      success: true,
      data: {
        id: assetData.id,
        title: assetData.title,
        category: assetData.category,
        metadata,
        classification,
        tags,
        urls: {
          video: videoUrl,
          thumbnail: thumbnailUrl
        }
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ 
      error: 'Upload failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// ===== local helpers to avoid heavy tfjs imports =====
type VideoMetadata = {
  duration: number;
  resolution: string; // e.g. 1920x1080
  bitrate: number;
  size?: number;
  format: string;
}

async function extractMetadata(videoPath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, m) => {
      if (err) return reject(err);
      const vs = m.streams.find(s => (s as any).codec_type === 'video') as any;
      if (!vs) return reject(new Error('No video stream found'));
      const meta: VideoMetadata = {
        duration: Math.round((m.format.duration as number) || 0),
        resolution: `${vs.width}x${vs.height}`,
        bitrate: m.format.bit_rate ? parseInt(String(m.format.bit_rate)) : 0,
        size: m.format.size ? parseInt(String(m.format.size)) : undefined,
        format: String(m.format.format_name || 'unknown')
      };
      resolve(meta);
    });
  });
}

function validateMetadata(meta: VideoMetadata): string[] {
  const errors: string[] = [];
  const format = meta.format.toLowerCase();
  const allowed = ['mp4', 'mov', 'avi', 'webm'];
  if (!allowed.some(f => format.includes(f))) {
    errors.push(`Unsupported format: ${format}`);
  }
  if (meta.duration < 9 || meta.duration > 11) {
    errors.push(`Video duration must be ~10s (current: ${meta.duration}s)`);
  }
  const [w, h] = meta.resolution.split('x').map(Number);
  if (w < 720 || h < 720) {
    errors.push(`Resolution too low: ${meta.resolution}`);
  }
  const maxSize = 100 * 1024 * 1024;
  if (typeof meta.size === 'number' && meta.size > maxSize) {
    errors.push(`File size exceeds 100MB: ${(meta.size / 1024 / 1024).toFixed(2)}MB`);
  }
  return errors;
}

async function generateThumbnail(videoPath: string, outputPath?: string): Promise<string> {
  const out = outputPath || path.join(process.cwd(), 'temp', 'thumbnails', `${Date.now()}.jpg`);
  await fs.mkdir(path.dirname(out), { recursive: true });
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .seekInput(2)
      .frames(1)
      .output(out)
      .size('720x1280')
      .on('end', () => resolve(out))
      .on('error', reject)
      .run();
  });
}

function generateTags(meta: VideoMetadata, classification: { category: string }): string[] {
  const tags: string[] = [];
  tags.push(String(classification.category));
  const [w, h] = meta.resolution.split('x').map(Number);
  if (w >= 3840) tags.push('4K');
  else if (w >= 1920) tags.push('Full HD');
  else if (w >= 1280) tags.push('HD');
  const ratio = w / h;
  if (Math.abs(ratio - 9 / 16) < 0.1) tags.push('9:16');
  else if (Math.abs(ratio - 16 / 9) < 0.1) tags.push('16:9');
  else if (Math.abs(ratio - 1) < 0.1) tags.push('1:1');
  tags.push(`${meta.duration}秒`);
  return Array.from(new Set(tags));
}

export const config = {
  api: {
    bodyParser: false,
  },
};
