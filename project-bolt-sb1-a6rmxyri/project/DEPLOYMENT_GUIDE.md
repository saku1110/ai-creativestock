# Vercelデプロイガイド

## 前提条件
- Vercelアカウント
- GitHubアカウント
- Supabaseプロジェクト
- Stripe本番アカウント

## デプロイ手順

### 1. GitHubリポジトリの準備

```bash
# プロジェクトディレクトリで実行
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/ai-creative-stock.git
git push -u origin main
```

### 2. Vercelへのデプロイ

1. [Vercel Dashboard](https://vercel.com/dashboard)にアクセス
2. "New Project"をクリック
3. GitHubリポジトリをインポート
4. プロジェクト設定で以下を確認：
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

### 3. 環境変数の設定

Vercelダッシュボードで以下の環境変数を設定：

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_key
VITE_APP_ENV=production
VITE_APP_URL=https://your-domain.vercel.app
```

### 4. Supabase設定

#### データベース初期化
```sql
-- Supabaseダッシュボードで実行
-- project-bolt-sb1-a6rmxyri/project/database/schema.sql の内容を実行
```

#### 認証プロバイダー設定
1. Supabase Authenticationセクション
2. Providers → Google/Apple有効化
3. リダイレクトURL設定: `https://your-domain.vercel.app/auth/callback`

### 5. Stripe設定

#### Webhook設定
1. Stripe Dashboard → Developers → Webhooks
2. エンドポイント追加: `https://your-domain.vercel.app/api/stripe-webhook`
3. イベント選択:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

#### 価格ID更新
`src/lib/stripe.ts`の本番価格IDを更新

### 6. デプロイ実行

```bash
# 変更をプッシュ
git add .
git commit -m "Production configuration"
git push

# Vercelが自動デプロイ実行
```

### 7. 動作確認

- [ ] トップページ表示
- [ ] Google/Apple認証
- [ ] Stripe決済フロー
- [ ] 動画ダウンロード
- [ ] ダッシュボード機能

## トラブルシューティング

### ビルドエラー
```bash
npm run build
```
ローカルでビルドを確認

### 環境変数エラー
Vercelダッシュボードで環境変数の再確認

### CORS エラー
Supabaseダッシュボードでドメイン設定確認

## 本番環境への移行チェックリスト

- [ ] Stripe本番キー設定
- [ ] Supabase本番URL設定
- [ ] カスタムドメイン設定
- [ ] SSL証明書確認
- [ ] バックアップ設定
- [ ] モニタリング設定
- [ ] エラー通知設定