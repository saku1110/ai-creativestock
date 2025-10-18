#!/usr/bin/env tsx
/**
 * 動画とスタートフレーム画像（サムネイル）にウォーターマーク（画像）を適用するCLI
 *
 * 使い方:
 *   npm run watermark:apply -- \
 *     --input ./videos/sample.mp4 \
 *     --output ./out \
 *     --wm ./brand/watermark.png \
 *     --pos bottom-right \
 *     --opacity 0.8 \
 *     --wm-scale 0.18 \
 *     --thumb --thumb-time 0.5
 */

import fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
import { VideoWatermarkProcessor } from '../lib/videoWatermark'

type Position = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath)
}

function parseArgs() {
  const args = process.argv.slice(2)
  const opts: any = {
    input: '',
    output: './watermarked',
    wm: '',
    pos: 'bottom-right',
    opacity: 0.8,
    wmScale: 0.2, // 動画/サムネ幅に対する割合
    thumb: false,
    thumbTime: 0.0, // 秒
    help: false
  }

  for (let i = 0; i < args.length; i++) {
    const k = args[i]
    const v = args[i + 1]
    switch (k) {
      case '--input': opts.input = v; i++; break
      case '--output': opts.output = v; i++; break
      case '--wm': opts.wm = v; i++; break
      case '--pos': opts.pos = v; i++; break
      case '--opacity': opts.opacity = Math.max(0, Math.min(1, parseFloat(v))); i++; break
      case '--wm-scale':
      case '--wmScale': opts.wmScale = Math.max(0.01, Math.min(1, parseFloat(v))); i++; break
      case '--thumb': opts.thumb = true; break
      case '--thumb-time':
      case '--thumbTime': opts.thumbTime = Math.max(0, parseFloat(v)); i++; break
      case '--help':
      case '-h': opts.help = true; break
    }
  }
  return opts
}

function showHelp() {
  console.log(`\n画像ウォーターマーク適用ツール\n\n使用例:\n  npm run watermark:apply -- \\\n    --input ./videos/sample.mp4 \\\n    --output ./out \\\n    --wm ./brand/watermark.png \\\n    --pos bottom-right \\\n    --opacity 0.8 \\\n    --wm-scale 0.18 \\\n    --thumb --thumb-time 0.5\n\n位置(--pos): top-left | top-right | bottom-left | bottom-right | center\n`)
}

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true })
}

async function getVideoDimensions(inputPath: string): Promise<{ width: number, height: number }> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, meta) => {
      if (err) return reject(err)
      const v = meta.streams.find(s => (s as any).codec_type === 'video') as any
      if (!v) return reject(new Error('動画ストリームが見つかりません'))
      resolve({ width: v.width, height: v.height })
    })
  })
}

async function resizeWatermarkForBase(wmPath: string, baseWidth: number, scale: number): Promise<string> {
  const outDir = path.join(process.cwd(), 'temp', 'wm')
  await ensureDir(outDir)
  const outPath = path.join(outDir, `wm_${baseWidth}_${Math.round(scale*100)}.png`)

  try {
    const img = sharp(wmPath)
    const meta = await img.metadata()
    const targetWidth = Math.max(16, Math.round(baseWidth * scale))
    const factor = meta.width ? targetWidth / meta.width : 1
    const targetHeight = meta.height ? Math.max(16, Math.round(meta.height * factor)) : undefined
    await img.resize(targetWidth, targetHeight, { fit: 'inside', withoutEnlargement: true }).png().toFile(outPath)
    return outPath
  } catch (e) {
    throw new Error(`ウォーターマーク画像のリサイズに失敗: ${(e as Error).message}`)
  }
}

function positionToGravity(pos: Position): sharp.Gravity {
  switch (pos) {
    case 'top-left': return 'northwest'
    case 'top-right': return 'northeast'
    case 'bottom-left': return 'southwest'
    case 'bottom-right': return 'southeast'
    case 'center': return 'center'
    default: return 'southeast'
  }
}

async function extractThumbnail(inputPath: string, timeSec: number, outPath: string): Promise<string> {
  await ensureDir(path.dirname(outPath))
  return new Promise((resolve, reject) => {
    const cmd = ffmpeg(inputPath)
    if (timeSec && timeSec > 0) cmd.seekInput(timeSec)
    cmd.frames(1)
      .output(outPath)
      .on('end', () => resolve(outPath))
      .on('error', reject)
      .run()
  })
}

async function applyWatermarkToImage(baseImagePath: string, wmPath: string, outPath: string, pos: Position, opacity: number) {
  const wmBuffer = await sharp(wmPath).ensureAlpha().toBuffer()
  await sharp(baseImagePath)
    .composite([{ input: wmBuffer, gravity: positionToGravity(pos), blend: 'over', opacity }])
    .jpeg({ quality: 90 })
    .toFile(outPath)
}

async function processVideo(opts: any) {
  const { input, output, wm, pos, opacity, wmScale, thumb, thumbTime } = opts
  await ensureDir(output)
  const base = path.basename(input)
  const stem = base.replace(/\.[^.]+$/, '')
  const outVideo = path.join(output, `${stem}_wm.mp4`)

  // 動画幅からウォーターマークをリサイズ
  const { width } = await getVideoDimensions(input)
  const resizedWm = await resizeWatermarkForBase(wm, width, wmScale)

  // 動画へ適用（画像ウォーターマーク） - fluent-ffmpeg で実行
  await new Promise<void>((resolve, reject) => {
    const overlay = (() => {
      switch (pos as Position) {
        case 'top-left': return '10:10'
        case 'top-right': return 'main_w-overlay_w-10:10'
        case 'bottom-left': return '10:main_h-overlay_h-10'
        case 'bottom-right': return 'main_w-overlay_w-10:main_h-overlay_h-10'
        case 'center': return '(main_w-overlay_w)/2:(main_h-overlay_h)/2'
        default: return 'main_w-overlay_w-10:main_h-overlay_h-10'
      }
    })()
    ffmpeg(input)
      .input(resizedWm)
      .complexFilter([`[1]format=rgba,colorchannelmixer=aa=${opacity}[wm];[0][wm]overlay=${overlay}`])
      .outputOptions(['-codec:a', 'copy'])
      .save(outVideo)
      .on('end', () => resolve())
      .on('error', reject)
  })

  let thumbOut: string | undefined
  if (thumb) {
    // サムネイル抽出
    const rawThumb = path.join(output, `${stem}_frame.jpg`)
    await extractThumbnail(input, thumbTime, rawThumb)
    // サムネ幅に合わせてWMを再リサイズ
    const imgMeta = await sharp(rawThumb).metadata()
    const wmForThumb = await resizeWatermarkForBase(wm, imgMeta.width || width, wmScale)
    thumbOut = path.join(output, `${stem}_thumb_wm.jpg`)
    await applyWatermarkToImage(rawThumb, wmForThumb, thumbOut, pos as Position, opacity)
    // 中間ファイル削除
    await fs.unlink(rawThumb).catch(() => {})
  }

  return { outVideo, thumbOut }
}

async function main() {
  const opts = parseArgs()
  if (opts.help || !opts.input || !opts.wm) {
    showHelp()
    process.exit(opts.help ? 0 : 1)
  }

  const stat = await fs.stat(opts.input).catch(() => null)
  if (!stat) throw new Error(`入力が見つかりません: ${opts.input}`)

  if (stat.isDirectory()) {
    const files = await fs.readdir(opts.input)
    const vids = files.filter(f => /\.(mp4|mov|avi|mkv|webm)$/i.test(f))
    if (vids.length === 0) throw new Error('動画ファイルが見つかりません')
    for (const f of vids) {
      const inputPath = path.join(opts.input, f)
      console.log(`▶ 処理中: ${f}`)
      const { outVideo, thumbOut } = await processVideo({ ...opts, input: inputPath })
      console.log(`   ✅ 動画: ${outVideo}`)
      if (thumbOut) console.log(`   🖼️ サムネ: ${thumbOut}`)
    }
  } else {
    const { outVideo, thumbOut } = await processVideo(opts)
    console.log(`✅ 出力: ${outVideo}`)
    if (thumbOut) console.log(`🖼️ サムネ: ${thumbOut}`)
  }
}

// 実行
main().catch(err => {
  console.error('エラー:', err?.message || err)
  process.exit(1)
})
