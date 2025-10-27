import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

type MapCat = 'fitness' | 'haircare' | 'oralcare' | 'diet' | 'beauty';
const CAT_MAP: Record<'fitness' | 'haircare' | 'oralcare', 'diet' | 'beauty'> = {
  fitness: 'diet',
  haircare: 'beauty',
  oralcare: 'beauty',
};

interface Options {
  bucket: string;
  dryRun: boolean;
  moveStorage: boolean;
}

function parseArgs(argv: string[]): Options {
  const opts: Options = { bucket: 'video-assets', dryRun: false, moveStorage: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const v = argv[i + 1];
    switch (a) {
      case '--bucket': opts.bucket = v || opts.bucket; i++; break;
      case '--dry-run':
      case '--dry': opts.dryRun = true; break;
      case '--move-storage': opts.moveStorage = true; break;
      default: break;
    }
  }
  return opts;
}

function extractPathFromUrl(url: string, bucket: string): string | null {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/');
    // Look for the bucket segment and take the rest as object key
    const idx = parts.findIndex((p) => p === bucket);
    if (idx >= 0 && idx + 1 < parts.length) {
      return parts.slice(idx + 1).join('/');
    }
    return null;
  } catch {
    return null;
  }
}

async function main() {
  const opts = parseArgs(process.argv);
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Missing SUPABASE_URL or SERVICE ROLE KEY');
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log(`[migrate] categories -> bucket=${opts.bucket} dry=${opts.dryRun} move=${opts.moveStorage}`);

  // 1) Update DB categories
  const legacy = ['fitness', 'haircare', 'oralcare'] as const;
  for (const oldCat of legacy) {
    const newCat = CAT_MAP[oldCat];
    console.log(`[migrate] DB category ${oldCat} -> ${newCat}`);
    if (!opts.dryRun) {
      const { error } = await supabase.from('video_assets').update({ category: newCat }).eq('category', oldCat);
      if (error) console.warn(`  update error: ${error.message}`);
    }
  }

  if (!opts.moveStorage) {
    console.log('[migrate] storage move skipped (flag not set)');
    return;
  }

  // 2) Move storage objects best-effort and update URLs
  const { data, error } = await supabase
    .from('video_assets')
    .select('id, category, file_url, thumbnail_url')
    .in('category', ['diet', 'beauty']); // after DB update
  if (error) throw error;

  let moved = 0, skipped = 0, updated = 0;
  for (const row of data || []) {
    const videoPath = row.file_url ? extractPathFromUrl(row.file_url, opts.bucket) : null;
    const thumbPath = row.thumbnail_url ? extractPathFromUrl(row.thumbnail_url, opts.bucket) : null;

    const planMove = (p: string | null): { from: string; to: string } | null => {
      if (!p) return null;
      if (p.startsWith('videos/fitness/')) return { from: p, to: p.replace('videos/fitness/', 'videos/diet/') };
      if (p.startsWith('thumbnails/fitness/')) return { from: p, to: p.replace('thumbnails/fitness/', 'thumbnails/diet/') };
      if (p.startsWith('videos/haircare/')) return { from: p, to: p.replace('videos/haircare/', 'videos/beauty/') };
      if (p.startsWith('thumbnails/haircare/')) return { from: p, to: p.replace('thumbnails/haircare/', 'thumbnails/beauty/') };
      if (p.startsWith('videos/oralcare/')) return { from: p, to: p.replace('videos/oralcare/', 'videos/beauty/') };
      if (p.startsWith('thumbnails/oralcare/')) return { from: p, to: p.replace('thumbnails/oralcare/', 'thumbnails/beauty/') };
      return null;
    };

    const v = planMove(videoPath);
    const t = planMove(thumbPath);
    if (!v && !t) { skipped++; continue; }
    if (!opts.dryRun) {
      if (v) {
        const { error: mvErr } = await supabase.storage.from(opts.bucket).move(v.from, v.to);
        if (mvErr) console.warn(`[move] ${v.from} -> ${v.to} failed: ${mvErr.message}`);
      }
      if (t) {
        const { error: mvErr } = await supabase.storage.from(opts.bucket).move(t.from, t.to);
        if (mvErr) console.warn(`[move] ${t.from} -> ${t.to} failed: ${mvErr.message}`);
      }
      moved++;

      const newVideoUrl = v
        ? supabase.storage.from(opts.bucket).getPublicUrl(v.to).data.publicUrl
        : row.file_url;
      const newThumbUrl = t
        ? supabase.storage.from(opts.bucket).getPublicUrl(t.to).data.publicUrl
        : row.thumbnail_url;

      const { error: upErr } = await supabase
        .from('video_assets')
        .update({ file_url: newVideoUrl, thumbnail_url: newThumbUrl })
        .eq('id', row.id);
      if (upErr) console.warn(`[db] update urls failed: ${upErr.message}`);
      else updated++;
    }
  }

  console.log(`[migrate] done. moved=${moved} updated=${updated} skipped=${skipped}`);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('supa-migrate-categories.ts')) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main();
}

