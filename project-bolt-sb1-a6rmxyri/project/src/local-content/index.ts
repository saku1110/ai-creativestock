import { resolveBeautySubCategory, type BeautySubCategory } from '../utils/categoryInference';
import { remoteManifest } from './remote-manifest';

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
}

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

const buildVideoList = (entries: Record<string, string>, prefix: string): LocalVideoItem[] => {
  return Object.entries(entries)
    .map(([key, url]) => {
      const manifestKey = key.replace(/^\.\//, '');
      const remoteEntry = remoteManifest[manifestKey];
      const { fileName, baseName } = sanitizeName(key);
      const slug = baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const title = formatTitle(baseName);
      return {
        id: `${prefix}-${slug || baseName || url}`,
        title,
        url: remoteEntry?.url ?? (url as string),
        fileName
      } satisfies LocalVideoItem;
    })
    .sort((a, b) => a.fileName.localeCompare(b.fileName));
};

const heroVideoModules = import.meta.glob('./hero/*.{mp4,MP4,webm,WEBM}', {
  eager: true,
  import: 'default',
  query: '?url'
}) as Record<string, string>;

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

export const localHeroVideos: LocalVideoItem[] = buildVideoList(heroVideoModules, 'hero');

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

    const rawCategory = relative[0]?.toLowerCase() ?? 'uncategorized';
    const category = rawCategory;

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

    const { fileName, baseName } = sanitizeName(key);
    const slug = baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const title = formatTitle(baseName);

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

      const video: LocalVideoItem = {
        id: `dashboard-${category}-${slug || baseName || url}`,
        title,
        url: url as string,
        fileName,
        category,
        beautySubCategory,
        ageFilterId: ageFolder ? AGE_FOLDER_MAP[ageFolder]?.id : undefined,
        genderFilterId: genderFolder ? GENDER_FOLDER_MAP[genderFolder]?.id : undefined,
        extraTags: []
      };

      if (video.extraTags) {
        if (ageFolder && AGE_FOLDER_MAP[ageFolder]) {
          video.extraTags.push(...AGE_FOLDER_MAP[ageFolder].tags);
        }
        if (genderFolder && GENDER_FOLDER_MAP[genderFolder]) {
          video.extraTags.push(...GENDER_FOLDER_MAP[genderFolder].tags);
        }
      }

      if (video.extraTags && video.extraTags.length === 0) {
        delete video.extraTags;
      }

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
