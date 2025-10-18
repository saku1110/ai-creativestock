import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'video';
  videoData?: {
    title: string;
    description: string;
    thumbnail: string;
    duration: number;
    category: string;
    tags: string[];
  };
}

const SEOHead: React.FC<SEOHeadProps> = ({
  title = 'AI Creative Stock - 10秒AI広告動画素材プラットフォーム',
  description = '美容・フィットネス・ビジネス向けの高品質AI生成広告動画素材。サブスクリプション制で無制限ダウンロード。4K・縦型動画で即座にマーケティングを強化。',
  keywords = 'AI動画,広告素材,マーケティング動画,美容動画,フィットネス動画,ビジネス動画,縦型動画,4K動画,AI生成,動画素材,広告制作',
  image = '/og-image.jpg',
  url = typeof window !== 'undefined' ? window.location.href : 'https://ai-creative-stock.com',
  type = 'website',
  videoData
}) => {
  const siteTitle = 'AI Creative Stock';
  const fullTitle = title.includes(siteTitle) ? title : `${title} | ${siteTitle}`;
  
  // 構造化データ（JSON-LD）
  const generateStructuredData = () => {
    const baseData = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: siteTitle,
      description,
      url: 'https://ai-creative-stock.com',
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://ai-creative-stock.com/search?q={search_term_string}',
        'query-input': 'required name=search_term_string'
      },
      publisher: {
        '@type': 'Organization',
        name: siteTitle,
        logo: {
          '@type': 'ImageObject',
          url: 'https://ai-creative-stock.com/logo.png'
        }
      }
    };

    if (videoData) {
      return {
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        name: videoData.title,
        description: videoData.description,
        thumbnailUrl: videoData.thumbnail,
        duration: `PT${videoData.duration}S`,
        genre: videoData.category,
        keywords: videoData.tags.join(', '),
        publisher: baseData.publisher,
        contentUrl: url,
        embedUrl: url,
        uploadDate: new Date().toISOString(),
        author: {
          '@type': 'Organization',
          name: siteTitle
        }
      };
    }

    return baseData;
  };

  return (
    <Helmet>
      {/* 基本メタタグ */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content="index, follow, max-image-preview:large" />
      <meta name="googlebot" content="index, follow" />
      
      {/* 言語・地域設定 */}
      <html lang="ja" />
      <meta name="language" content="Japanese" />
      <meta name="geo.region" content="JP" />
      <meta name="geo.country" content="Japan" />
      
      {/* Open Graph (Facebook, LinkedIn等) */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content={siteTitle} />
      <meta property="og:locale" content="ja_JP" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:site" content="@ai_creative_stock" />
      <meta name="twitter:creator" content="@ai_creative_stock" />
      
      {/* 動画特有のメタデータ */}
      {videoData && (
        <>
          <meta property="og:video" content={url} />
          <meta property="og:video:type" content="video/mp4" />
          <meta property="og:video:width" content="1080" />
          <meta property="og:video:height" content="1920" />
          <meta property="og:video:duration" content={videoData.duration.toString()} />
          <meta property="video:tag" content={videoData.tags.join(', ')} />
          <meta property="video:category" content={videoData.category} />
        </>
      )}
      
      {/* モバイル最適化 */}
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      
      {/* パフォーマンス・セキュリティ */}
      <meta name="referrer" content="strict-origin-when-cross-origin" />
      <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
      <meta httpEquiv="X-Frame-Options" content="DENY" />
      <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
      
      {/* キャッシュ制御 */}
      <meta httpEquiv="Cache-Control" content="public, max-age=31536000, immutable" />
      
      {/* Canonical URL */}
      <link rel="canonical" href={url} />
      
      {/* Favicon */}
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      <link rel="icon" type="image/png" href="/favicon.png" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      
      {/* PWA設定 */}
      <link rel="manifest" href="/manifest.json" />
      <meta name="theme-color" content="#06b6d4" />
      
      {/* 構造化データ */}
      <script type="application/ld+json">
        {JSON.stringify(generateStructuredData())}
      </script>
      
      {/* プリロード */}
      <link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      
      {/* DNS プリフェッチ */}
      <link rel="dns-prefetch" href="//cdn.example.com" />
      <link rel="dns-prefetch" href="//analytics.google.com" />
    </Helmet>
  );
};

export default SEOHead;