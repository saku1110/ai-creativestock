# Stripe連携セットアップガイド

## 1. Stripeアカウントの準備

### Stripeダッシュボードにアクセス
1. [Stripe Dashboard](https://dashboard.stripe.com/)にログイン
2. **開発者** → **APIキー**に移動

### APIキーの取得
```bash
# テスト環境用
公開可能キー: pk_test_xxxxx
シークレットキー: sk_test_xxxxx
```

## 2. 環境変数の設定

`.env`ファイルを更新してください：

```bash
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_stripe_publishable_key
STRIPE_SECRET_KEY=sk_test_your_actual_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Supabase Service Role Key（Edge Functions用）
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## 3. Stripe料金表の作成

### Stripeダッシュボードで以下の料金表を作成：

#### スタンダードプラン
- **月額**: ¥29,800 (price_standard_monthly)
- **年額**: ¥237,600 (price_standard_yearly)

#### プロプラン  
- **月額**: ¥49,800 (price_pro_monthly)
- **年額**: ¥357,600 (price_pro_yearly)

#### エンタープライズプラン
- **月額**: ¥79,800 (price_enterprise_monthly)  
- **年額**: ¥539,760 (price_enterprise_yearly)

### 料金表ID更新
`src/lib/stripe.ts`の価格IDを実際のIDに更新：

```typescript
monthlyStripePriceId: 'price_actual_monthly_id',
yearlyStripePriceId: 'price_actual_yearly_id',
```

## 4. Webhookエンドポイントの設定

### ローカル開発用
```bash
# Stripe CLIをインストール
npm install -g stripe-cli

# ログイン
stripe login

# Webhookを転送
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
```

### 本番環境用
1. Stripeダッシュボード → **開発者** → **Webhook**
2. エンドポイント追加: `https://your-project.supabase.co/functions/v1/stripe-webhook`
3. 以下のイベントを選択：
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

## 5. Supabase設定

### Edge Functionsの環境変数設定
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_your_key
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_secret
```

### データベーススキーマ適用
```bash
supabase db reset
```

## 6. テスト方法

### テスト用クレジットカード番号
```
カード番号: 4242 4242 4242 4242
有効期限: 12/34
CVC: 123
郵便番号: 12345
```

### 動作確認
1. アプリケーション起動: `npm run dev`
2. ユーザー登録・ログイン
3. 料金プランページでテスト決済実行
4. Webhookが正常に動作するか確認

## 7. 本番環境への移行

### 本番キーに変更
```bash
# 本番環境用キー
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_SECRET_KEY=sk_live_xxxxx
```

### 注意事項
- テストキーと本番キーは絶対に混同しない
- 本番環境では実際の決済が発生するため十分注意
- Webhookエンドポイントも本番用に変更が必要

## トラブルシューティング

### よくあるエラー
1. **Stripe公開可能キーが設定されていません**
   - `.env`ファイルの変数名を確認
   - `VITE_STRIPE_PUBLISHABLE_KEY`が正しく設定されているか

2. **料金表が見つかりません**
   - Stripeダッシュボードで料金表IDを確認
   - `src/lib/stripe.ts`のIDが正しいか

3. **Webhook署名が無効**
   - `STRIPE_WEBHOOK_SECRET`が正しく設定されているか
   - Webhookエンドポイントが正しいか

### ログ確認
```bash
# Supabase Edge Functions ログ
supabase functions logs stripe-checkout
supabase functions logs stripe-webhook
```