import { resolveBeautySubCategory, type BeautySubCategory } from '../utils/categoryInference';
import { getAssetBasename } from '../utils/videoAssetTools';
import { remoteManifest } from './remote-manifest';
import { DASHBOARD_REMOTE_THUMBS, DASHBOARD_REVIEW_HASHTAGS, DASHBOARD_REVIEW_CATEGORIES } from './dashboardThumbMap.generated';

export interface LocalVideoItem {
  id: string;
  title: string;
  url: string;
  fileName: string;
  category?: string;
  beautySubCategory?: BeautySubCategory;
  ageFilterId?: string;
  genderFilterId?: string;
  extraTags?: string[];
  thumbnailUrl?: string;
}

const DASHBOARD_CATEGORIES = ['beauty', 'diet', 'healthcare', 'business', 'lifestyle', 'romance'] as const;
type DashboardCategory = typeof DASHBOARD_CATEGORIES[number];

const normalizeDashboardCategory = (value?: string): DashboardCategory | undefined => {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  return (DASHBOARD_CATEGORIES as readonly string[]).includes(normalized)
    ? (normalized as DashboardCategory)
    : undefined;
};

const sanitizeName = (filePath: string): { fileName: string; baseName: string } => {
  const segments = filePath.split('/');
  const fileName = segments[segments.length - 1] ?? '';
  const baseName = fileName.replace(/\.[^/.]+$/, '');
  return { fileName, baseName };
};

const formatTitle = (baseName: string): string => {
  const replaced = baseName
    .replace(/[_-]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (!replaced) {
    return 'Untitled Clip';
  }
  return replaced
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const normalizeStem = (s: string): string => {
  try {
    return s
      .normalize('NFKD')
      .toLowerCase()
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  } catch {
    return s.toLowerCase().replace(/\.[^/.]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
};

const buildVideoList = (entries: Record<string, string>, prefix: string): LocalVideoItem[] => {
  const presentKeys = new Set<string>();
  const list: LocalVideoItem[] = Object.entries(entries)
    .map(([key, url]) => {
      const manifestKey = key.replace(/^\.\//, '');
      presentKeys.add(manifestKey);
      let remoteEntry = remoteManifest[manifestKey as keyof typeof remoteManifest];
      if (!remoteEntry) {
        // Fallback: match by normalized stem within same folder prefix
        const thisName = manifestKey.split('/').pop() || manifestKey;
        const thisStem = normalizeStem(thisName);
        const altKey = Object.keys(remoteManifest).find(k => {
          if (!k.startsWith(prefix + '/')) return false;
          const otherName = k.split('/').pop() || k;
          return normalizeStem(otherName) === thisStem;
        });
        if (altKey) remoteEntry = remoteManifest[altKey as keyof typeof remoteManifest];
      }
      const { fileName, baseName } = sanitizeName(key);
      const title = formatTitle(baseName);
      const stableId = manifestKey || `${prefix}-${fileName}` || `${prefix}-${baseName}` || `${prefix}-${url}`;
      return {
        id: stableId,
        title,
        url: remoteEntry?.url ?? (url as string),
        fileName
      } satisfies LocalVideoItem;
    })
    .sort((a, b) => a.fileName.localeCompare(b.fileName));

  // Also include remote-only items (present in manifest but not on local disk)
  const missingRemote = Object.keys(remoteManifest).filter((k) => k.startsWith(prefix + '/'));
  const existingNames = new Set(list.map((i) => i.fileName));
  for (const k of missingRemote) {
    if (presentKeys.has(k)) continue;
    const r = remoteManifest[k as keyof typeof remoteManifest];
    if (!r?.url) continue;
    const { fileName, baseName } = sanitizeName(k);
    if (existingNames.has(fileName)) continue;
    const stableId = k || `${prefix}-${fileName}` || `${prefix}-${baseName}`;
    list.push({
      id: stableId,
      title: formatTitle(baseName),
      url: r.url,
      fileName
    });
  }

  if (prefix === 'dashboard') {
    for (const video of list) {
      applyReviewMetadata(video);
      registerDashboardVideo(video);
    }
  }

  list.sort((a, b) => a.fileName.localeCompare(b.fileName));
  return list;
};

const heroVideoModules = import.meta.glob('./hero/*.{mp4,MP4,webm,WEBM}', {
  eager: true,
  import: 'default',
  query: '?url'
}) as Record<string, string>;

// Use only finalized watermarked outputs to avoid locking or oversized test files.
// Specifically pick files suffixed with -wm-alpha200.* (current production setting).
const heroWatermarkedModules = Object.fromEntries(
  Object.entries(heroVideoModules).filter(([key]) => key.includes('-wm-alpha200.'))
);

const lpGridVideoModules = import.meta.glob('./lp-grid/*.{mp4,MP4,webm,WEBM}', {
  eager: true,
  import: 'default',
  query: '?url'
}) as Record<string, string>;

const dashboardVideoModules = import.meta.glob('./dashboard/**/*.{mp4,MP4,webm,WEBM}', {
  eager: true,
  import: 'default',
  query: '?url'
}) as Record<string, string>;

const dashboardThumbModules = import.meta.glob('./dashboard-thumbs/**/*.{jpg,jpeg,png,JPG,JPEG,PNG}', {
  eager: true,
  import: 'default',
  query: '?url'
}) as Record<string, string>;

const DASHBOARD_THUMB_LOOKUP = new Map<string, string>();
const DASHBOARD_STEM_LOOKUP = new Map<string, string>();
const DASHBOARD_CORE_LOOKUP = new Map<string, string>();
const DASHBOARD_VIDEO_LOOKUP = new Map<string, LocalVideoItem>();

const stripWatermarkToken = (value: string) =>
  value.replace(/-wm-[a-z0-9]+$/i, '').replace(/-wm$/i, '');

const registerThumbKey = (key: string, url?: string) => {
  if (!key) return;
  if (url) {
    DASHBOARD_THUMB_LOOKUP.set(key, url);
  }
  const normalized = normalizeStem(key);
  if (normalized && !DASHBOARD_STEM_LOOKUP.has(normalized)) {
    DASHBOARD_STEM_LOOKUP.set(normalized, key);
  }
  const core = stripWatermarkToken(normalized);
  if (core && !DASHBOARD_CORE_LOOKUP.has(core)) {
    DASHBOARD_CORE_LOOKUP.set(core, key);
  }
};

for (const [key, url] of Object.entries(dashboardThumbModules)) {
  const file = key.split('/').pop() ?? '';
  const base = file.replace(/\.[^/.]+$/, '').toLowerCase();
  if (base) {
    registerThumbKey(base, url);
  }
}

for (const base of Object.keys(DASHBOARD_REMOTE_THUMBS)) {
  registerThumbKey(base);
}

const toThumbKey = (input: string): string => getAssetBasename(input);

const resolveReviewKey = (identifier?: string): string | undefined => {
  if (!identifier) return undefined;
  const directKey = toThumbKey(identifier);
  if (directKey) {
    if (DASHBOARD_THUMB_LOOKUP.has(directKey) || DASHBOARD_REMOTE_THUMBS[directKey]) {
      return directKey;
    }
  }
  const normalized = normalizeStem(directKey || identifier);
  if (normalized) {
    const stemMatch = DASHBOARD_STEM_LOOKUP.get(normalized);
    if (stemMatch) return stemMatch;
    const coreMatch = DASHBOARD_CORE_LOOKUP.get(stripWatermarkToken(normalized));
    if (coreMatch) return coreMatch;
  }
  return undefined;
};

export const findDashboardThumbnail = (identifier?: string): string | undefined => {
  const reviewKey = resolveReviewKey(identifier);
  if (reviewKey) {
    return DASHBOARD_THUMB_LOOKUP.get(reviewKey) ?? DASHBOARD_REMOTE_THUMBS[reviewKey];
  }
  return undefined;
};

const applyReviewMetadata = (video: LocalVideoItem) => {
  if (!video?.fileName) return;
  const metaKey =
    resolveReviewKey(video.fileName) ??
    resolveReviewKey(video.title) ??
    resolveReviewKey(video.id) ??
    stripWatermarkToken(video.fileName?.replace(/\.[^/.]+$/, '').toLowerCase());
  if (!metaKey) return;

  const reviewCategory = DASHBOARD_REVIEW_CATEGORIES[metaKey];
  if (reviewCategory) {
    video.category = reviewCategory;
  } else if (!video.category || !normalizeDashboardCategory(video.category)) {
    video.category = 'lifestyle';
  }

  if (!video.thumbnailUrl) {
    video.thumbnailUrl = DASHBOARD_THUMB_LOOKUP.get(metaKey) ?? DASHBOARD_REMOTE_THUMBS[metaKey];
  }

  if (!video.extraTags?.length) {
    const reviewHashtags = DASHBOARD_REVIEW_HASHTAGS[metaKey];
    if (reviewHashtags?.length) {
      video.extraTags = [...reviewHashtags];
    }
  }

  if (video.category === 'beauty' && !video.beautySubCategory) {
    const tokens = metaKey.split(/[\s_\-]+/).filter(Boolean);
    const beautyResult = resolveBeautySubCategory({
      tokens,
      pathHints: []
    });
    video.beautySubCategory = beautyResult.subCategory;
  }
};

const registerDashboardVideo = (video: LocalVideoItem) => {
  const candidates = [
    resolveReviewKey(video.fileName),
    resolveReviewKey(video.id),
    resolveReviewKey(video.title),
    normalizeStem(video.fileName || ''),
    stripWatermarkToken(normalizeStem(video.fileName || ''))
  ].filter(Boolean) as string[];

  for (const key of candidates) {
    if (!DASHBOARD_VIDEO_LOOKUP.has(key)) {
      DASHBOARD_VIDEO_LOOKUP.set(key, video);
    }
  }
};

export const findLocalDashboardVideo = (identifier?: string): LocalVideoItem | undefined => {
  const key = resolveReviewKey(identifier);
  if (key && DASHBOARD_VIDEO_LOOKUP.has(key)) {
    return DASHBOARD_VIDEO_LOOKUP.get(key);
  }
  const normalized = normalizeStem(identifier || '');
  if (normalized) {
    const altKey = DASHBOARD_STEM_LOOKUP.get(normalized);
    if (altKey) {
      return DASHBOARD_VIDEO_LOOKUP.get(altKey);
    }
    const coreKey = DASHBOARD_CORE_LOOKUP.get(stripWatermarkToken(normalized));
    if (coreKey) {
      return DASHBOARD_VIDEO_LOOKUP.get(coreKey);
    }
  }
  return undefined;
};

export const localHeroVideos: LocalVideoItem[] = buildVideoList(heroWatermarkedModules, 'hero');

export const localLpGridVideos: LocalVideoItem[] = buildVideoList(lpGridVideoModules, 'lp-grid');

const AGE_FOLDER_MAP: Record<string, { id: string; tags: string[] }> = {
  teen: { id: 'teen', tags: ['10代', 'ティーン', 'teen', 'teenage'] },
  teens: { id: 'teen', tags: ['10代', 'ティーン', 'teen', 'teenage'] },
  twenties: { id: 'twenties', tags: ['20代', '20s'] },
  thirties: { id: 'thirties', tags: ['30代', '30s'] },
  forties: { id: 'forties', tags: ['40代', '40s'] },
  fifties: { id: 'fifties_plus', tags: ['50代', 'シニア', '50s'] },
  fifties_plus: { id: 'fifties_plus', tags: ['50代', 'シニア', '50s'] },
  seniors: { id: 'fifties_plus', tags: ['シニア', '50代', '50s'] },
  adults: { id: 'twenties', tags: ['大人', '20代', '30代'] }
};

const GENDER_FOLDER_MAP: Record<string, { id: string; tags: string[] }> = {
  female: { id: 'female', tags: ['女性', '女', 'female', 'woman'] },
  women: { id: 'female', tags: ['女性', '女', 'female', 'woman'] },
  lady: { id: 'female', tags: ['女性', '女', 'female', 'woman'] },
  male: { id: 'male', tags: ['男性', '男', 'male', 'man'] },
  men: { id: 'male', tags: ['男性', '男', 'male', 'man'] },
  gentleman: { id: 'male', tags: ['男性', '男', 'male', 'man'] },
  mixed: { id: 'mixed', tags: ['男女', 'カップル', 'mixed', 'couple'] },
  couple: { id: 'mixed', tags: ['男女', 'カップル', 'mixed', 'couple'] }
};

const buildDashboardVideos = () => {
  const byCategory = new Map<string, LocalVideoItem[]>();

  for (const [key, url] of Object.entries(dashboardVideoModules)) {
    const parts = key.split('/').filter(Boolean);
    const dashboardIndex = parts.indexOf('dashboard');
    const relative = dashboardIndex >= 0 ? parts.slice(dashboardIndex + 1) : parts;
    if (relative.length === 0) continue;
    if (relative.some(segment => segment.startsWith('_'))) continue;

    const { fileName, baseName } = sanitizeName(key);
    const metaKey = baseName.toLowerCase();
    const rawCategory = relative[0]?.toLowerCase() ?? 'uncategorized';
    let category: DashboardCategory = normalizeDashboardCategory(rawCategory) ?? 'lifestyle';
    const reviewCategory = DASHBOARD_REVIEW_CATEGORIES[metaKey];
    if (reviewCategory) {
      category = reviewCategory;
    }

    const potentialAgeSegment = relative.length > 2 ? relative[1]?.toLowerCase() : undefined;
    const potentialGenderSegment = relative.length > 3 ? relative[2]?.toLowerCase() : undefined;

    let ageFolder: string | undefined;
    let genderFolder: string | undefined;

    if (potentialAgeSegment && AGE_FOLDER_MAP[potentialAgeSegment]) {
      ageFolder = potentialAgeSegment;
      if (potentialGenderSegment && GENDER_FOLDER_MAP[potentialGenderSegment]) {
        genderFolder = potentialGenderSegment;
      } else if (relative.length > 3) {
        // third segment not recognized as gender, treat as age sibling, keep undefined
      }
    } else if (relative.length > 2) {
      const maybeGender = relative[1]?.toLowerCase();
      if (maybeGender && GENDER_FOLDER_MAP[maybeGender]) {
        genderFolder = maybeGender;
      }
    }

    const manifestKey = key.replace(/^\.\//, '');
    const title = formatTitle(baseName);
    const thumbnailUrl = DASHBOARD_THUMB_LOOKUP.get(metaKey) ?? DASHBOARD_REMOTE_THUMBS[metaKey];

    let beautySubCategory: BeautySubCategory | undefined;
    if (category === 'beauty') {
      const tokens = baseName
        .toLowerCase()
        .split(/[\s_\-]+/)
        .filter(Boolean);
      const beautyResult = resolveBeautySubCategory({
        tokens,
        pathHints: parts
      });
      beautySubCategory = beautyResult.subCategory;
    }

    const reviewHashtags = DASHBOARD_REVIEW_HASHTAGS[metaKey];
    const video: LocalVideoItem = {
      id: manifestKey || `dashboard-${category}-${fileName}`,
      title,
      url: url as string,
      fileName,
      category,
      thumbnailUrl,
      beautySubCategory,
      ageFilterId: ageFolder ? AGE_FOLDER_MAP[ageFolder]?.id : undefined,
      genderFilterId: genderFolder ? GENDER_FOLDER_MAP[genderFolder]?.id : undefined,
      extraTags: reviewHashtags?.length ? [...reviewHashtags] : undefined
    };

    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }
    byCategory.get(category)!.push(video);
  }

  for (const videos of byCategory.values()) {
    videos.sort((a, b) => a.fileName.localeCompare(b.fileName));
  }

  const flat = Array.from(byCategory.entries()).flatMap(([category, videos]) =>
    videos.map(video => ({ ...video, category }))
  );

  return {
    byCategory,
    flat
  };
};

const dashboardVideos = buildDashboardVideos();

export const localDashboardVideosByCategory: Record<string, LocalVideoItem[]> = Object.fromEntries(
  Array.from(dashboardVideos.byCategory.entries())
);

export const localDashboardVideos: LocalVideoItem[] = dashboardVideos.flat;

export const hasLocalHeroVideos = localHeroVideos.length > 0;
export const hasLocalLpGridVideos = localLpGridVideos.length > 0;
export const hasLocalDashboardVideos = localDashboardVideos.length > 0;
