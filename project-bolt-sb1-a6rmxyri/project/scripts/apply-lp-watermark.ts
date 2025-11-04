#!/usr/bin/env tsx
import path from 'path';
import fs from 'fs/promises';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
// Ensure ffprobe is available for fluent-ffmpeg's metadata calls
// On some environments ffprobe is not on PATH, so use ffprobe-static if present
let ffprobePath: string | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - runtime resolution only
  ffprobePath = (await import('ffprobe-static')).path as string;
} catch {
  ffprobePath = undefined;
}
import sharp from 'sharp';

async function ensureExists(p: string) {
  const st = await fs.stat(p).catch(() => null);
  if (!st) throw new Error(`Path not found: ${p}`);
}

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath as string);
}
if (ffprobePath) {
  // fluent-ffmpeg requires ffprobe to read video metadata (size, streams, etc.)
  ffmpeg.setFfprobePath(ffprobePath as string);
}

async function getVideoSize(p: string): Promise<{width:number;height:number}> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(p, (err, meta) => {
      if (err) return reject(err);
      const v = meta.streams.find(s => (s as any).codec_type === 'video') as any;
      if (!v) return reject(new Error('video stream not found'));
      resolve({ width: v.width, height: v.height });
    });
  });
}

async function processDir(dir: string, wmPath: string, opacity: number) {
  await ensureExists(dir);
  const files = await fs.readdir(dir);
  const mp4s = files.filter(f => /\.mp4$/i.test(f));
  let ok = 0; let ng = 0;

  for (const f of mp4s) {
    const input = path.join(dir, f);
    const tmp = input + '.__wm_tmp.mp4';
    process.stdout.write(`▶ ${path.relative(process.cwd(), input)} ... `);
    try {
      const { width, height } = await getVideoSize(input);
      // prepare resized watermark image
      const tmpDir = path.join(process.cwd(), 'temp', 'wm');
      await fs.mkdir(tmpDir, { recursive: true });
      const wmResized = path.join(tmpDir, `lpwm_${width}x${height}.png`);
      await sharp(wmPath).resize(width, height, { fit: 'cover' }).png().toFile(wmResized);

      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(input)
          .input(wmResized)
          // 保持されたアルファを利用して合成。overlay の format=auto と alpha で透過を適用
          .complexFilter(`[1:v]format=rgba[wm];[0:v][wm]overlay=0:0:format=auto:alpha=${opacity}[out]`)
          .outputOptions([
            '-map','[out]','-map','0:a?',
            '-c:v','libx264','-crf','22','-preset','veryfast','-pix_fmt','yuv420p','-movflags','+faststart',
            '-c:a','aac','-b:a','128k'
          ])
          .save(tmp)
          .on('end', () => resolve())
          .on('error', reject);
      });

      await fs.unlink(wmResized).catch(() => {});
      await fs.unlink(input).catch(() => {});
      await fs.rename(tmp, input);
      console.log('done');
      ok++;
    } catch (e:any) {
      await fs.unlink(tmp).catch(() => {});
      console.log(`failed: ${e?.message || e}`);
      ng++;
    }
  }
  return { ok, ng };
}

async function main() {
  const heroDir = path.resolve(process.cwd(), 'src/local-content/hero');
  const gridDir = path.resolve(process.cwd(), 'src/local-content/lp-grid');
  const wmPath = path.resolve(process.cwd(), process.env.WATERMARK_IMAGE_PATH || 'brand/watermark-9x16.png');
  const opacity = process.env.WATERMARK_IMAGE_OPACITY ? Number(process.env.WATERMARK_IMAGE_OPACITY) : 0.85;

  await ensureExists(wmPath);

  console.log(`Using watermark: ${wmPath} (opacity=${opacity})`);

  const a = await processDir(heroDir, wmPath, opacity);
  const b = await processDir(gridDir, wmPath, opacity);

  console.log(`\nSummary: hero ok=${a.ok}, ng=${a.ng}; lp-grid ok=${b.ok}, ng=${b.ng}`);
}

main().catch(err => {
  console.error('apply-lp-watermark error:', err?.message || err);
  process.exit(1);
});
