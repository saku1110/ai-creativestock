# AI Creative Stock 技術スタック

## フロントエンド
- **React 18.3.1** - UIライブラリ
- **TypeScript** - 型安全な開発
- **Vite** - ビルドツール・開発サーバー
- **Tailwind CSS** - ユーティリティファーストのCSSフレームワーク
- **lucide-react** - アイコンライブラリ
- **react-helmet-async** - SEO対策
- **react-window** - 仮想スクロール（パフォーマンス最適化）

## バックエンド・インフラ
- **Supabase** - Backend as a Service
  - 認証システム
  - データベース（PostgreSQL）
  - ストレージ（動画ファイル管理）
  - リアルタイムサブスクリプション
- **Vercel** - ホスティング・デプロイメント

## 決済・セキュリティ
- **Stripe** - 決済処理
- **bcryptjs** - パスワードハッシュ化
- **DOMPurify** - XSS対策

## 開発ツール
- **ESLint** - コード品質管理
- **Vitest** - テストフレームワーク
- **PostCSS** - CSS処理
- **Autoprefixer** - CSSベンダープレフィックス

## プロジェクト構造
- `/src` - ソースコード
- `/public` - 静的ファイル
- `/database` - データベース関連
- `/supabase` - Supabase設定
- `/scripts` - ユーティリティスクリプト
- `/k8s` - Kubernetes設定（将来の拡張用）