import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve('.');
const csvPath = path.join(projectRoot, 'temp', 'dashboard-review-labeled.csv');
const outputPath = path.join(projectRoot, 'src', 'local-content', 'dashboardThumbMap.generated.ts');

if (!fs.existsSync(csvPath)) {
  console.error(`CSV not found at ${csvPath}`);
  process.exit(1);
}

const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
};

const parseCsv = (input: string) => {
  const lines = input.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines.shift()!);
  return lines.map(line => {
    const values = parseCsvLine(line);
    const record: Record<string, string> = {};
    headers.forEach((header, idx) => {
      record[header] = values[idx] ?? '';
    });
    return record;
  });
};

const VALID_CATEGORIES = ['beauty', 'diet', 'healthcare', 'business', 'lifestyle', 'romance'] as const;
type DashboardCategory = typeof VALID_CATEGORIES[number];

const CATEGORY_ALIAS_MAP: Record<string, DashboardCategory> = {
  beauty: 'beauty',
  'ビューティー': 'beauty',
  '美容': 'beauty',
  'beauty/skin': 'beauty',
  'beauty/hair': 'beauty',
  diet: 'diet',
  'ダイエット': 'diet',
  'diet/fitness': 'diet',
  healthcare: 'healthcare',
  'ヘルスケア': 'healthcare',
  medical: 'healthcare',
  business: 'business',
  'ビジネス': 'business',
  lifestyle: 'lifestyle',
  'ライフスタイル': 'lifestyle',
  romance: 'romance',
  'ロマンス': 'romance'
};

const normalizeCategory = (value?: string): DashboardCategory | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const normalized = trimmed.toLowerCase();
  if ((VALID_CATEGORIES as readonly string[]).includes(normalized)) {
    return normalized as DashboardCategory;
  }
  return CATEGORY_ALIAS_MAP[trimmed] || CATEGORY_ALIAS_MAP[normalized];
};

const AGE_HASHTAG_MAP: Record<string, string> = {
  teen: '10代',
  teens: '10代',
  teenager: '10代',
  teenagers: '10代',
  twenties: '20代',
  thirties: '30代',
  forties: '40代',
  fifties: '50代',
  'fifties+': '50代',
  fifties_plus: '50代',
  seniors: 'シニア',
  senior: 'シニア',
  adults: '大人',
  adult: '大人'
};

const GENDER_HASHTAG_MAP: Record<string, string> = {
  female: '女性',
  women: '女性',
  woman: '女性',
  lady: '女性',
  male: '男性',
  men: '男性',
  man: '男性',
  gentleman: '男性',
  mixed: '男女',
  couple: 'カップル',
  couples: 'カップル'
};

const BLOCKED_TAG_KEYS = new Set([
  'local',
  'beauty',
  'diet',
  'healthcare',
  'business',
  'lifestyle',
  'romance',
  'pet'
]);

const sanitizeHashtagValue = (value?: string) => {
  if (!value) return undefined;
  const cleaned = value.replace(/[#\s\u3000]/g, '').trim();
  if (!cleaned) return undefined;
  const lowered = cleaned.toLowerCase();
  if (BLOCKED_TAG_KEYS.has(lowered)) return undefined;
  return `#${cleaned}`;
};

const splitTagCandidates = (input?: string): string[] => {
  if (!input) return [];
  return input
    .split(/[,\u3001\uFF0C;；|/／]+/g)
    .map(part => part.trim())
    .filter(Boolean);
};

const formatForTsString = (value: string) => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const csvRaw = fs.readFileSync(csvPath, 'utf8');
const rows = parseCsv(csvRaw);

const thumbMap = new Map<string, string>();
const hashtagMap = new Map<string, string[]>();
const categoryMap = new Map<string, DashboardCategory>();

for (const row of rows) {
  const relPath = row['rel_path']?.trim();
  if (!relPath) continue;

  const baseName = path.basename(relPath).replace(/\.[^/.]+$/, '').toLowerCase();
  if (!baseName) continue;

  const thumbUrl = row['thumb_url']?.trim();
  if (thumbUrl) {
    thumbMap.set(baseName, thumbUrl);
  }

  const reviewCategory = normalizeCategory(row['final_category']);
  if (reviewCategory) {
    categoryMap.set(baseName, reviewCategory);
  }

  const tagSet = new Set<string>();
  const addHashtag = (value?: string) => {
    const hashtag = sanitizeHashtagValue(value);
    if (hashtag) tagSet.add(hashtag);
  };

  const addMappedHashtag = (value: string | undefined, map: Record<string, string>) => {
    if (!value) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    const mapped = map[trimmed.toLowerCase()] ?? trimmed;
    addHashtag(mapped);
  };

  addMappedHashtag(row['final_age'], AGE_HASHTAG_MAP);
  addMappedHashtag(row['final_gender'], GENDER_HASHTAG_MAP);

  const finalTagsRaw = row['final_tags']?.trim();
  if (finalTagsRaw) {
    for (const candidate of splitTagCandidates(finalTagsRaw)) {
      addHashtag(candidate);
    }
  }

  if (tagSet.size > 0) {
    hashtagMap.set(baseName, Array.from(tagSet));
  }
}

if (thumbMap.size === 0 && hashtagMap.size === 0) {
  console.warn('No thumbnail URLs or hashtag metadata found in CSV. Nothing to do.');
  process.exit(0);
}

const thumbLines = Array.from(thumbMap.entries())
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([key, url]) => `  "${key}": "${formatForTsString(url)}",`);

const hashtagLines = Array.from(hashtagMap.entries())
  .sort(([a], [b]) => a.localeCompare(b))
  .map(
    ([key, tags]) =>
      `  "${key}": [${tags.map(tag => `"${formatForTsString(tag)}"`).join(', ')}],`
  );

const categoryLines = Array.from(categoryMap.entries())
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([key, category]) => `  "${key}": "${category}",`);

const banner = [
  '/**',
  ' * AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.',
  ' * Run `npx tsx scripts/generate-dashboard-thumb-map.ts` after updating dashboard-review-labeled.csv.',
  ` * Last generated: ${new Date().toISOString()}`,
  ' */'
].join('\n');
const categoryTypeDef = `type DashboardReviewCategory = ${VALID_CATEGORIES.map(cat => `'${cat}'`).join(' | ')};`;

const fileContents = `${banner}
/* eslint-disable */

${categoryTypeDef}

export const DASHBOARD_REMOTE_THUMBS: Record<string, string> = {
${thumbLines.join('\n')}
};

export const DASHBOARD_REVIEW_HASHTAGS: Record<string, string[]> = {
${hashtagLines.join('\n')}
};

export const DASHBOARD_REVIEW_CATEGORIES: Record<string, DashboardReviewCategory> = {
${categoryLines.join('\n')}
};
`;

fs.writeFileSync(outputPath, fileContents, 'utf8');
console.log(
  `Wrote ${thumbMap.size} thumbnail entries and ${hashtagMap.size} hashtag entries to ${path.relative(
    projectRoot,
    outputPath
  )}.`
);
