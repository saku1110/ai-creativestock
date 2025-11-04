#!/usr/bin/env tsx
import path from 'path';
import fs from 'fs/promises';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import sharp from 'sharp';

async function ensureExists(p: string) {
  const st = await fs.stat(p).catch(() => null);
  if (!st) throw new Error(`Path not found: ${p}`);
}

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath as string);
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
          .complexFilter(`[1:v]format=rgba,colorchannelmixer=aa=${opacity}[wm];[0:v][wm]overlay=0:0`)
          .outputOptions(['-codec:a', 'copy'])
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
