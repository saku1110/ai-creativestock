export type BeautySubCategory = 'skincare' | 'haircare' | 'oralcare';
export type VideoCategory = 'beauty' | 'fitness' | 'haircare' | 'business' | 'lifestyle';
export type CategorySource = 'filename' | 'model' | 'manual';

export interface CategoryClassification {
  category: VideoCategory;
  confidence: number;
  keywords: string[];
  source?: CategorySource;
  beautySubCategory?: BeautySubCategory;
}

export const VIDEO_CATEGORIES: VideoCategory[] = ['beauty', 'fitness', 'haircare', 'business', 'lifestyle'];

const BEAUTY_SUBCATEGORY_HINTS: Record<BeautySubCategory, string[]> = {
  skincare: ['skincare', 'skin', 'cream', 'serum', 'lotion', 'toner', 'mask', 'facewash', 'cleansing', '美容液', 'スキンケア', '化粧水', '乳液', '美容クリーム'],
  haircare: ['haircare', 'hair', 'shampoo', 'conditioner', 'treatment', 'styling', 'salon', 'ヘア', 'ヘアケア', 'シャンプー', 'トリートメント', '美髪'],
  oralcare: ['oralcare', 'oral', 'mouth', 'tooth', 'teeth', 'dental', 'whitening', 'toothpaste', 'mouthwash', 'オーラル', 'オーラルケア', '歯磨き', 'ホワイトニング', '歯科']
};

const BEAUTY_SUBCATEGORY_LABELS: Record<BeautySubCategory, string> = {
  skincare: 'スキンケア',
  haircare: 'ヘアケア',
  oralcare: 'オーラルケア'
};

const CATEGORY_HINTS: Record<VideoCategory, string[]> = {
  beauty: ['beauty', 'cosme', 'cosmetic', 'makeup', 'skincare', 'esthetic', 'salon', 'nail', 'spa', '美', '美容', 'コスメ', 'メイク', 'スキンケア'],
  fitness: ['fitness', 'workout', 'gym', 'training', 'exercise', 'athlete', 'yoga', 'muscle', 'run', 'fit', 'スポーツ', '筋トレ', 'フィットネス', 'ワークアウト', 'ヨガ'],
  haircare: ['hair', 'haircare', 'haircut', 'salon', 'barber', 'styling', 'shampoo', 'conditioner', 'ヘア', '美容室', 'サロン', 'カット', '理容'],
  business: ['business', 'office', 'corporate', 'meeting', 'presentation', 'startup', 'company', 'work', 'desk', 'sales', 'ビジネス', 'オフィス', '会議', '企業', '仕事'],
  lifestyle: ['lifestyle', 'life', 'daily', 'home', 'family', 'travel', 'cafe', 'kitchen', 'living', 'relax', '日常', 'ライフ', '暮らし', 'ライフスタイル', 'カフェ', '旅']
};

const sanitizeToken = (value: string): string => value
  .replace(/[^a-z0-9ぁ-んァ-ヶ一-龠ー]+/gi, '')
  .trim();

const tokenize = (base: string): string[] => base
  .split(/[\s_\-]+/)
  .map(token => sanitizeToken(token.toLowerCase()))
  .filter(Boolean);

const splitPath = (filePath: string): string[] => filePath
  .replace(/\\/g, '/')
  .split('/');

const collectPathHints = (filePath?: string): string[] => {
  if (!filePath) return [];
  return splitPath(filePath)
    .map(segment => sanitizeToken(segment.toLowerCase()))
    .filter(Boolean);
};

const resolveBeautySubCategoryInternal = (candidates: string[]): { subCategory?: BeautySubCategory; matched: string[] } => {
  const normalizedCandidates = Array.from(new Set(
    candidates
      .map(value => sanitizeToken(value.toLowerCase()))
      .filter(Boolean)
  ));

  if (normalizedCandidates.length === 0) {
    return { subCategory: undefined, matched: [] };
  }

  let best: BeautySubCategory | undefined;
  let bestScore = 0;
  let bestMatched: string[] = [];

  const evaluateHint = (candidate: string, hint: string): number => {
    if (!candidate || !hint) return 0;
    if (candidate === hint) return 1;
    if (candidate.startsWith(hint) || hint.startsWith(candidate)) return 0.85;
    if (candidate.includes(hint) || hint.includes(candidate)) return 0.75;
    return 0;
  };

  for (const [subCategory, hints] of Object.entries(BEAUTY_SUBCATEGORY_HINTS) as Array<[BeautySubCategory, string[]]>) {
    let score = 0;
    const matched: string[] = [];

    for (const hint of hints) {
      const normalizedHint = sanitizeToken(hint.toLowerCase());
      if (!normalizedHint) continue;

      for (const candidate of normalizedCandidates) {
        const candidateScore = evaluateHint(candidate, normalizedHint);
        if (candidateScore > 0) {
          matched.push(hint);
          score = Math.max(score, candidateScore);
        }
      }
    }

    if (normalizedCandidates.includes(subCategory)) {
      score = Math.max(score, 1);
      matched.push(BEAUTY_SUBCATEGORY_LABELS[subCategory]);
    }

    if (score > bestScore && matched.length > 0) {
      bestScore = score;
      best = subCategory;
      bestMatched = matched;
    }
  }

  return {
    subCategory: best,
    matched: Array.from(new Set(bestMatched))
  };
};

export const resolveBeautySubCategory = (input: {
  tokens?: string[];
  pathHints?: string[];
  keywords?: string[];
}): { subCategory?: BeautySubCategory; matched: string[] } => {
  const candidates = [
    ...(input.tokens ?? []),
    ...(input.pathHints ?? []),
    ...(input.keywords ?? [])
  ];

  return resolveBeautySubCategoryInternal(candidates);
};

export const isVideoCategory = (value: unknown): value is VideoCategory =>
  typeof value === 'string' && (VIDEO_CATEGORIES as string[]).includes(value.toLowerCase());

export interface FilenameCategoryOptions {
  fallback?: VideoCategory;
  filePath?: string;
}

export const inferCategoryFromFilename = (
  fileName: string,
  options: FilenameCategoryOptions = {}
): CategoryClassification => {
  const fallbackCategory = options.fallback || 'lifestyle';
  const lowerName = fileName.toLowerCase();
  const baseName = lowerName.replace(/\.[^.]+$/, '');
  const tokens = tokenize(baseName);
  const pathHints = collectPathHints(options.filePath);
  const firstToken = tokens[0];

  let bestCategory: VideoCategory = fallbackCategory;
  let bestScore = 0;
  const bestKeywords = new Set<string>();
  let beautySubCategory: BeautySubCategory | undefined;

  for (const category of VIDEO_CATEGORIES) {
    let score = 0;
    const matched = new Set<string>();

    if (firstToken === category) {
      score = Math.max(score, 0.95);
      matched.add(category);
    }

    if (tokens.includes(category)) {
      score = Math.max(score, 0.9);
      matched.add(category);
    }

    if (pathHints.includes(category)) {
      score = Math.max(score, 0.9);
      matched.add(category);
    }

    for (const hint of CATEGORY_HINTS[category]) {
      const normalizedHint = sanitizeToken(hint.toLowerCase());
      if (!normalizedHint) continue;

      if (tokens.includes(normalizedHint)) {
        score = Math.max(score, 0.85);
        matched.add(hint);
      } else if (baseName.includes(normalizedHint)) {
        score = Math.max(score, 0.75);
        matched.add(hint);
      } else if (pathHints.some(segment => segment.includes(normalizedHint))) {
        score = Math.max(score, 0.8);
        matched.add(hint);
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
      bestKeywords.clear();
      matched.forEach(value => bestKeywords.add(value));
    }
  }

  const normalizedTokens = tokens
    .map(token => token.trim())
    .filter(Boolean);

  normalizedTokens.slice(0, 6).forEach(token => bestKeywords.add(token));

  if (bestCategory === 'beauty') {
    const beautyResult = resolveBeautySubCategory({
      tokens,
      pathHints,
      keywords: Array.from(bestKeywords)
    });

    if (beautyResult.subCategory) {
      beautySubCategory = beautyResult.subCategory;
      beautyResult.matched.forEach(value => bestKeywords.add(value));
      bestKeywords.add(beautyResult.subCategory);
      bestKeywords.add(BEAUTY_SUBCATEGORY_LABELS[beautyResult.subCategory]);
    }
  }

  const confidence = bestScore > 0 ? bestScore : 0.5;

  return {
    category: bestCategory,
    confidence,
    keywords: Array.from(bestKeywords).slice(0, 10),
    source: 'filename',
    beautySubCategory
  };
};
