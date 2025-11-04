# SEO・エラーハンドリング実装ガイド

## 🔍 SEO最適化の実装

### 1. **メタタグ最適化**
```tsx
// SEOHead コンポーネント
<SEOHead 
  title="AI動画素材ダッシュボード"
  description="4K品質のAI生成広告動画素材を検索・ダウンロード"
  keywords="AI動画,広告素材,マーケティング動画"
  videoData={{
    title: "美容クリーム広告",
    description: "高級美容クリームの魅力的な広告動画",
    thumbnail: "https://example.com/thumb.jpg",
    duration: 10,
    category: "beauty",
    tags: ["美容", "クリーム", "スキンケア"]
  }}
/>
```

### 2. **構造化データ (JSON-LD)**
- WebSite schema
- VideoObject schema  
- BreadcrumbList schema
- Organization schema

### 3. **Open Graph & Twitter Card**
- 動的OG画像生成
- 動画メタデータ
- SNSシェア最適化

### 4. **パンくずリスト**
```tsx
// 自動生成されるパンくずリスト
<Breadcrumbs pathname="/category/beauty" />
// 出力: ホーム > 美容・スキンケア動画素材
```

## 🚨 エラーハンドリングシステム

### 1. **ErrorBoundary**
- React エラーの捕獲
- 自動リトライ機能 (最大3回)
- ユーザーフレンドリーなエラー画面
- 開発環境での詳細エラー表示

### 2. **useErrorHandler フック**
```tsx
const { 
  errors, 
  addError, 
  handleApiError, 
  handleSupabaseError,
  handleStripeError 
} = useErrorHandler();

// API エラーハンドリング
try {
  const data = await fetchVideoData();
} catch (error) {
  handleApiError(error, 'ビデオデータ取得');
}
```

### 3. **エラー分類システム**
- **Network**: ネットワーク接続エラー
- **Auth**: 認証・認可エラー  
- **Server**: サーバーエラー (5xx)
- **Client**: クライアントエラー (4xx)
- **Validation**: 入力値検証エラー

### 4. **ErrorToast コンポーネント**
- 重要度別色分け表示
- 自動削除タイマー (10秒)
- 一括削除機能
- アニメーション付きトースト

## 📊 SEO設定詳細

### カテゴリ別SEOデータ
```typescript
const categorySEOData = {
  beauty: {
    title: '美容・スキンケア動画素材',
    description: '美容クリーム、スキンケア、コスメ製品のプロモーション動画素材...',
    keywords: '美容動画,スキンケア動画,コスメ動画...'
  },
  // 他のカテゴリ...
};
```

### ページ別SEOデータ
```typescript
const pageSEOData = {
  dashboard: {
    title: 'AI動画素材ダッシュボード',
    description: '4K品質のAI生成広告動画素材を検索・ダウンロード...'
  },
  // 他のページ...
};
```

### 動的SEO生成
```typescript
// 動画詳細ページ用SEO
const videoSEOTitle = generateVideoSEOTitle(
  "美容クリーム広告", 
  "beauty"
);
// → "美容クリーム広告 - 美容素材 | AI Creative Stock"

const videoSEODescription = generateVideoSEODescription(
  "美容クリーム広告",
  "高級美容クリームの魅力的な広告動画です。",
  "beauty",
  ["美容", "クリーム", "スキンケア"]
);
```

## 🛠️ 技術仕様

### 使用ライブラリ
- **react-helmet-async**: メタタグ管理
- **TypeScript**: 型安全なエラーハンドリング

### SEO機能
- ✅ メタタグ最適化
- ✅ 構造化データ (JSON-LD)
- ✅ Open Graph / Twitter Card
- ✅ サイトマップ生成
- ✅ robots.txt
- ✅ PWA マニフェスト
- ✅ パンくずリスト
- ✅ 正規URL設定

### エラーハンドリング機能
- ✅ React Error Boundary
- ✅ API エラーハンドリング
- ✅ Supabase エラー対応
- ✅ Stripe エラー対応
- ✅ ネットワークエラー検出
- ✅ 自動リトライ機能
- ✅ エラートースト表示
- ✅ エラー分類・重要度判定

## 🎯 パフォーマンス指標

### Core Web Vitals 目標値
- **LCP**: 2.5秒以下
- **FID**: 100ms以下  
- **CLS**: 0.1以下

### SEO スコア目標
- **Lighthouse SEO**: 95点以上
- **構造化データ**: エラー0個
- **メタタグ**: 100%適切な設定

## 🔧 設定ファイル

### PWA マニフェスト (`/public/manifest.json`)
```json
{
  "name": "AI Creative Stock - AI動画素材プラットフォーム",
  "short_name": "AI Creative Stock",
  "description": "美容・フィットネス・ビジネス向けの高品質AI生成広告動画素材",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#06b6d4"
}
```

### Robots.txt (`/public/robots.txt`)
```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/private/

Sitemap: https://ai-creative-stock.com/sitemap.xml
```

### サイトマップ (`/public/sitemap.xml`)
- 静的ページ URL
- カテゴリページ URL  
- 更新頻度・優先度設定

## 📈 監視・分析

### エラー監視
```typescript
// エラー報告（本番環境では外部サービスに送信）
const reportError = (error: Error, errorInfo: ErrorInfo) => {
  const errorReport = {
    message: error.message,
    stack: error.stack,
    componentStack: errorInfo.componentStack,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  };
  
  // Sentry.captureException(error, { extra: errorReport });
};
```

### SEO監視ツール
- Google Search Console
- Google Analytics 4
- Lighthouse CI
- PageSpeed Insights

## 🚀 デプロイ前チェックリスト

### SEO
- [ ] メタタグが全ページに設定済み
- [ ] 構造化データが有効
- [ ] OG画像が生成される
- [ ] サイトマップが最新
- [ ] robots.txt が適切
- [ ] パンくずリストが表示

### エラーハンドリング  
- [ ] ErrorBoundary が全コンポーネントを包む
- [ ] APIエラーが適切にハンドリング
- [ ] ユーザーフレンドリーなエラーメッセージ
- [ ] 自動リトライが動作
- [ ] エラートーストが表示
- [ ] 開発環境でエラー詳細が見える

### PWA
- [ ] マニフェストファイルが有効
- [ ] アイコンが全サイズ用意済み
- [ ] テーマカラーが設定済み
- [ ] オフライン対応（今後実装）

これで企業レベルのSEO対策とエラーハンドリングが完成です！