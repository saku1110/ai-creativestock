/**
 * SEO最適化のためのユーティリティ関数
 */

// カテゴリ別のSEOデータ
export const categorySEOData = {
  beauty: {
    title: '美容・スキンケア動画素材',
    description: '美容クリーム、スキンケア、コスメ製品のプロモーション動画素材。高級感のあるAI生成動画で美容ブランドのマーケティングを強化。',
    keywords: '美容動画,スキンケア動画,コスメ動画,美容広告,化粧品プロモーション,美容マーケティング',
  },
  fitness: {
    title: 'フィットネス・健康動画素材', 
    description: 'ジム、ヨガ、トレーニング、健康食品のプロモーション動画素材。モチベーション溢れるAI生成動画でフィットネス事業をサポート。',
    keywords: 'フィットネス動画,ジム動画,トレーニング動画,ヨガ動画,健康動画,スポーツマーケティング',
  },
  haircare: {
    title: 'ヘアケア・美髪動画素材',
    description: 'シャンプー、トリートメント、ヘアスタイリング製品のプロモーション動画素材。美しい髪を演出するAI生成動画。',
    keywords: 'ヘアケア動画,シャンプー動画,トリートメント動画,美髪動画,ヘアスタイル動画',
  },
  business: {
    title: 'ビジネス・企業動画素材',
    description: 'コンサルティング、金融、ITサービスのプロモーション動画素材。プロフェッショナルなAI生成動画で信頼性を演出。',
    keywords: 'ビジネス動画,企業動画,コンサルティング動画,金融動画,プロフェッショナル動画',
  },
  lifestyle: {
    title: 'ライフスタイル・生活動画素材',
    description: '日用品、インテリア、ファッション、ライフスタイル製品のプロモーション動画素材。豊かな生活を提案するAI生成動画。',
    keywords: 'ライフスタイル動画,生活動画,インテリア動画,ファッション動画,日用品動画',
  },
};

// ページ別のSEOデータ
export const pageSEOData = {
  dashboard: {
    title: 'AI動画素材ダッシュボード',
    description: '4K品質のAI生成広告動画素材を検索・ダウンロード。美容、フィットネス、ビジネス向けの縦型動画でマーケティング効果を最大化。',
  },
  pricing: {
    title: '料金プラン - サブスクリプション',
    description: '月額制でAI動画素材が使い放題。スタンダード、プロ、ビジネスプランから選択し、柔軟にスケールアップ可能。',
  },
  favorites: {
    title: 'お気に入り動画素材',
    description: 'お気に入りに追加したAI生成動画素材を一覧表示。効率的な素材管理でマーケティング制作をスムーズに。',
  },
  'download-history': {
    title: 'ダウンロード履歴',
    description: 'ダウンロードした動画素材の履歴と統計を確認。利用傾向を分析してマーケティング戦略を最適化。',
  },
  'payment-history': {
    title: '決済履歴・請求書',
    description: 'サブスクリプションの決済履歴と請求書をダウンロード。企業の経理処理に必要な書類を完備。',
  },
};

/**
 * URLからページタイプを判定
 */
export const getPageType = (pathname: string): keyof typeof pageSEOData | null => {
  const segments = pathname.split('/').filter(Boolean);
  const page = segments[0] || 'dashboard';
  
  if (page in pageSEOData) {
    return page as keyof typeof pageSEOData;
  }
  
  return null;
};

/**
 * カテゴリからSEOデータを取得
 */
export const getCategorySEO = (category: string) => {
  return categorySEOData[category as keyof typeof categorySEOData] || null;
};

/**
 * 動画用のSEOタイトルを生成
 */
export const generateVideoSEOTitle = (videoTitle: string, category: string): string => {
  const categoryData = getCategorySEO(category);
  const categoryName = categoryData ? categoryData.title.split('・')[0] : 'AI動画';
  return `${videoTitle} - ${categoryName}素材 | AI Creative Stock`;
};

/**
 * 動画用のSEO説明文を生成
 */
export const generateVideoSEODescription = (
  videoTitle: string, 
  description: string, 
  category: string,
  tags: string[]
): string => {
  const categoryData = getCategorySEO(category);
  const categoryDesc = categoryData ? categoryData.title : 'AI動画素材';
  const tagString = tags.slice(0, 3).join('・');
  
  return `${videoTitle} - ${description.slice(0, 100)}... 【${categoryDesc}】${tagString ? ` #${tagString}` : ''} 高品質4K・縦型動画素材をダウンロード。`;
};

/**
 * サイトマップ生成用のURL一覧
 */
export const getSitemapUrls = () => {
  const baseUrl = 'https://ai-creative-stock.com';
  
  const staticUrls = [
    { url: baseUrl, priority: 1.0, changefreq: 'daily' },
    { url: `${baseUrl}/pricing`, priority: 0.9, changefreq: 'weekly' },
    { url: `${baseUrl}/about`, priority: 0.8, changefreq: 'monthly' },
    { url: `${baseUrl}/contact`, priority: 0.7, changefreq: 'monthly' },
    { url: `${baseUrl}/terms`, priority: 0.6, changefreq: 'monthly' },
    { url: `${baseUrl}/privacy`, priority: 0.6, changefreq: 'monthly' },
  ];
  
  const categoryUrls = Object.keys(categorySEOData).map(category => ({
    url: `${baseUrl}/category/${category}`,
    priority: 0.8,
    changefreq: 'daily'
  }));
  
  return [...staticUrls, ...categoryUrls];
};

/**
 * robots.txt生成
 */
export const generateRobotsTxt = (): string => {
  return `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/private/
Disallow: /temp/
Disallow: /*.json$

# Sitemap
Sitemap: https://ai-creative-stock.com/sitemap.xml

# クロール頻度制限
Crawl-delay: 1

# 主要検索エンジン向け特別設定
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Slurp
Allow: /`;
};

/**
 * Open Graph画像URLを生成
 */
export const generateOGImageUrl = (
  title: string,
  category?: string,
  thumbnail?: string
): string => {
  const params = new URLSearchParams({
    title: title.slice(0, 60),
    ...(category && { category }),
    ...(thumbnail && { thumbnail })
  });
  
  return `https://ai-creative-stock.com/api/og-image?${params.toString()}`;
};

/**
 * パンくずリスト生成
 */
export const generateBreadcrumbs = (pathname: string) => {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs = [
    { name: 'ホーム', url: '/' }
  ];
  
  let currentPath = '';
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    
    let name = segment;
    if (segment in pageSEOData) {
      name = pageSEOData[segment as keyof typeof pageSEOData].title;
    } else if (segment in categorySEOData) {
      name = categorySEOData[segment as keyof typeof categorySEOData].title;
    }
    
    breadcrumbs.push({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      url: currentPath
    });
  });
  
  return breadcrumbs;
};

/**
 * メタキーワード生成
 */
export const generateMetaKeywords = (
  baseKeywords: string,
  category?: string,
  tags?: string[]
): string => {
  const keywords = [baseKeywords];
  
  if (category && categorySEOData[category as keyof typeof categorySEOData]) {
    keywords.push(categorySEOData[category as keyof typeof categorySEOData].keywords);
  }
  
  if (tags && tags.length > 0) {
    keywords.push(tags.join(','));
  }
  
  return keywords.join(',');
};
