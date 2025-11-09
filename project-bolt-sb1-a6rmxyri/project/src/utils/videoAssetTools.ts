export type VideoAssetLike = {
  id?: string;
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  duration?: number;
  resolution?: string;
  file_url?: string;
  preview_url?: string;
  thumbnail_url?: string;
  is_featured?: boolean;
  download_count?: number;
  created_at?: string;
  beautySubCategory?: string | null;
  [key: string]: unknown;
};

type VideoFingerprints = {
  id?: string;
  file?: string;
  thumbnails: string[];
  title?: string;
};

export const getAssetBasename = (value?: string): string => {
  if (!value || typeof value !== 'string') return '';
  const withoutQuery = (value.split('?')[0] ?? value).trim();
  if (!withoutQuery) return '';
  const normalized = withoutQuery.replace(/%2F/gi, '/');
  const segments = normalized.split(/[/\\]/).filter(Boolean);
  if (segments.length === 0) return '';
  const filename = segments[segments.length - 1];
  return filename.replace(/\.[^/.]+$/, '').toLowerCase();
};

export const assetsMatchByFilename = (source?: string, candidate?: string): boolean => {
  if (!source || !candidate) return false;
  const sourceKey = getAssetBasename(source);
  const candidateKey = getAssetBasename(candidate);
  return !!sourceKey && sourceKey === candidateKey;
};

const INAPPROPRIATE_TAG_PATTERNS: RegExp[] = [
  /\bnsfw\b/i,
  /\bsex(?![a-z])/i,
  /\bsexy\b/i,
  /\berotic\b/i,
  /\bfetish\b/i,
  /\bnude\b/i,
  /\bnudity\b/i,
  /\bporn\b/i,
  /\br18\b/i,
  /18\+/,
  /\badult\b/i,
  /\bsensual\b/i,
  /\bseductive\b/i,
  /\bexplicit\b/i,
  /\bhentai\b/i,
  /\bxxx\b/i,
  /セクシー/i,
  /エッチ/i,
  /えっち/i,
  /エロ/i,
  /いやらしい/,
  /官能/,
  /卑猥/,
  /アダルト/,
  /性的/,
  /下着/,
  /ランジェリー/,
  /ヌード/,
  /裸/,
  /過激/,
  /挑発/
];

const BANNED_TAGS = new Set(['#fitness', 'fitness']);

const stripQueryAndHash = (value?: string) => {
  if (!value) return '';
  const [withoutQuery] = value.split(/[?#]/);
  return (withoutQuery || value).trim();
};

const normalizeAssetIdentifier = (value?: string) => {
  if (!value || typeof value !== 'string') return '';
  const trimmed = stripQueryAndHash(value);
  if (!trimmed || trimmed.startsWith('data:')) return '';
  const withoutProtocol = trimmed.replace(/^[a-z]+:\/\//i, '');
  const normalizedSlashes = withoutProtocol.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalizedSlashes) return '';
  const segments = normalizedSlashes.split('/').filter(Boolean);
  if (segments.length === 0) return '';
  return segments.slice(-3).join('/').toLowerCase();
};

const normalizeTitleSignature = (title?: string, duration?: number, resolution?: string) => {
  if (!title) return '';
  let normalized = title;
  try {
    normalized = normalized.normalize('NFKC');
  } catch {
    // noop: normalization not supported in some runtimes
  }
  const base = normalized.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!base) return '';
  const parts = [base];
  if (resolution) {
    parts.push(resolution.toLowerCase().replace(/\s+/g, ''));
  }
  if (typeof duration === 'number' && Number.isFinite(duration)) {
    parts.push(String(Math.max(0, Math.round(duration))));
  }
  return parts.join('::');
};

const buildFingerprints = (video: VideoAssetLike): VideoFingerprints => {
  const thumbnailCandidates = new Set<string>();
  const primaryThumb = normalizeAssetIdentifier(video.thumbnail_url);
  const previewThumb = normalizeAssetIdentifier(video.preview_url);
  if (primaryThumb) thumbnailCandidates.add(primaryThumb);
  if (previewThumb) thumbnailCandidates.add(previewThumb);

  return {
    id: typeof video.id === 'string' ? video.id.trim().toLowerCase() || undefined : undefined,
    file: normalizeAssetIdentifier(video.file_url),
    thumbnails: Array.from(thumbnailCandidates),
    title: normalizeTitleSignature(video.title, video.duration, video.resolution)
  };
};

const registerFingerprints = (
  ownerKey: string,
  fingerprints: VideoFingerprints,
  registry: Map<string, string>
) => {
  if (fingerprints.file) {
    registry.set(`file:${fingerprints.file}`, ownerKey);
  }
  for (const thumb of fingerprints.thumbnails) {
    registry.set(`thumb:${thumb}`, ownerKey);
  }
  if (fingerprints.title) {
    registry.set(`title:${fingerprints.title}`, ownerKey);
  }
  if (fingerprints.id) {
    registry.set(`id:${fingerprints.id}`, ownerKey);
  }
};

const hasMeaningfulText = (value?: string | null) => Boolean(value && value.toString().trim());
const isFallbackThumbnail = (value?: string) => !value || value.startsWith('data:image/svg+xml');

export const sanitizeTags = (tags?: Array<string | null | undefined>): string[] => {
  if (!Array.isArray(tags) || tags.length === 0) return [];
  const seen = new Set<string>();
  const sanitized: string[] = [];

  for (const raw of tags) {
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const normalized = trimmed.toLowerCase();
    const isBanned = INAPPROPRIATE_TAG_PATTERNS.some((pattern) => pattern.test(trimmed) || pattern.test(normalized));
    if (isBanned) continue;
    if (BANNED_TAGS.has(normalized)) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    sanitized.push(trimmed);
  }

  return sanitized;
};

const mergeVideoRecords = <T extends VideoAssetLike>(target: T, source: T): T => {
  target.tags = sanitizeTags([...(target.tags ?? []), ...(source.tags ?? [])]) as T['tags'];

  if (!hasMeaningfulText(target.description) && hasMeaningfulText(source.description)) {
    target.description = source.description;
  }

  if (
    source.category &&
    source.category !== 'lifestyle' &&
    (!target.category || target.category === 'lifestyle')
  ) {
    target.category = source.category;
  }

  if (!target.preview_url && source.preview_url) {
    target.preview_url = source.preview_url;
  }

  if (!target.file_url && source.file_url) {
    target.file_url = source.file_url;
  }

  if (isFallbackThumbnail(target.thumbnail_url) && !isFallbackThumbnail(source.thumbnail_url)) {
    target.thumbnail_url = source.thumbnail_url;
  }

  if ((source.download_count ?? 0) > (target.download_count ?? 0)) {
    target.download_count = source.download_count;
  }

  const targetCreatedAt = target.created_at ? Date.parse(target.created_at) : 0;
  const sourceCreatedAt = source.created_at ? Date.parse(source.created_at) : 0;
  if (sourceCreatedAt > targetCreatedAt) {
    target.created_at = source.created_at;
  }

  if (!target.duration && source.duration) {
    target.duration = source.duration;
  }

  if (!target.resolution && source.resolution) {
    target.resolution = source.resolution;
  }

  if (!target.beautySubCategory && source.beautySubCategory) {
    target.beautySubCategory = source.beautySubCategory;
  }

  if (source.is_featured && !target.is_featured) {
    target.is_featured = true;
  }

  return target;
};

export const dedupeVideoAssets = <T extends VideoAssetLike>(videos: T[]): T[] => {
  if (!Array.isArray(videos) || videos.length === 0) return [];

  const canonicalVideos = new Map<string, T>();
  const fingerprintOwners = new Map<string, string>();
  let fallbackIndex = 0;

  for (const video of videos) {
    const normalizedVideo = {
      ...(video as Record<string, unknown>),
      tags: sanitizeTags(video.tags ?? [])
    } as T;

    const fingerprints = buildFingerprints(normalizedVideo);
    const ownerKey =
      (fingerprints.file && fingerprintOwners.get(`file:${fingerprints.file}`)) ||
      fingerprints.thumbnails
        .map((thumb) => fingerprintOwners.get(`thumb:${thumb}`))
        .find((key): key is string => Boolean(key)) ||
      (fingerprints.title && fingerprintOwners.get(`title:${fingerprints.title}`)) ||
      (fingerprints.id && fingerprintOwners.get(`id:${fingerprints.id}`));

    if (!ownerKey) {
      const newKey =
        (fingerprints.file && `file:${fingerprints.file}`) ||
        (fingerprints.thumbnails[0] && `thumb:${fingerprints.thumbnails[0]}`) ||
        (fingerprints.title && `title:${fingerprints.title}`) ||
        (fingerprints.id && `id:${fingerprints.id}`) ||
        `generated-${fallbackIndex++}`;

      canonicalVideos.set(newKey, normalizedVideo);
      registerFingerprints(newKey, fingerprints, fingerprintOwners);
      continue;
    }

    const existing = canonicalVideos.get(ownerKey);
    if (!existing) {
      canonicalVideos.set(ownerKey, normalizedVideo);
      registerFingerprints(ownerKey, fingerprints, fingerprintOwners);
      continue;
    }

    mergeVideoRecords(existing, normalizedVideo);
    registerFingerprints(ownerKey, fingerprints, fingerprintOwners);
  }

  return Array.from(canonicalVideos.values());
};
