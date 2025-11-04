# Watermark Composition Settings

This document captures the exact settings used to generate watermarked videos for hero, lp-grid, and can be applied to dashboard as well.

## Source Assets

- Base videos: `src/local-content/<folder>/*.mp4`
- Watermark image: `project/brand/watermark-9x16.png`

## FFmpeg Pipeline (command-line)

- Full-frame overlay using the watermark’s original size, with amplified alpha for visibility.
- H.264 output, yuv420p for compatibility, and faststart for web playback.

Example:

```
ffmpeg -y -i "<input>.mp4" -i project/brand/watermark-9x16.png \
  -filter_complex "[1:v]format=rgba,colorchannelmixer=aa=2.0[wm];[0:v][wm]overlay=0:0,format=yuv420p[outv]" \
  -map "[outv]" -map 0:a? -c:v libx264 -profile:v high -level 4.1 -pix_fmt yuv420p \
  -crf 20 -preset medium -c:a copy -movflags +faststart "<output>-wm-alpha200.mp4"
```

Key points:

- Overlay: `overlay=0:0` (full-frame). The watermark image is the same 9:16 size as the base.
- Alpha: `colorchannelmixer=aa=2.0` (roughly “2.0x” visibility boost). Adjust as needed (e.g. 1.4, 1.2).
- Compatibility: `-pix_fmt yuv420p` and `-movflags +faststart`.
- Naming: Suffix finalized outputs with `-wm-alpha200.mp4`.

## Folder Workflow

1. Put original videos under `src/local-content/<folder>`.
2. Render watermarked outputs alongside originals using the command above.
3. Move originals into a backup folder: `src/local-content/<folder>/_backup/`.
4. Upload finalized watermarked outputs (`*-wm-alpha200.mp4`) to Supabase Storage at `local-content/<folder>/`.

## Upload Scripts

Script to upload and maintain the manifest for a specific subfolder (e.g. hero, lp-grid):

- `scripts/upload-watermarked-folder.ts`

Usage:

```
npx tsx scripts/upload-watermarked-folder.ts hero
npx tsx scripts/upload-watermarked-folder.ts lp-grid
```

Environment (from `.env`):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET` (default: `local-content`)

Behavior:

- Deletes existing objects under the specified prefix (`hero/`, `lp-grid/`).
- Uploads local `*-wm-alpha200.*` files.
- Updates `src/local-content/remote-manifest.ts` by merging new entries.

## Applying To Dashboard

Use the same pipeline and naming for `src/local-content/dashboard/<...>`. After rendering:

```
npx tsx scripts/upload-watermarked-folder.ts dashboard
```

This will clear `local-content/dashboard/` in Storage, upload `*-wm-alpha200.*` outputs, and merge the manifest.

