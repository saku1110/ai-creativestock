# メール通知システム セットアップガイド

## 📧 メール通知機能の概要

AI Creative Stockでは、以下のタイミングで自動メール通知が送信されます：

### 🎯 **送信されるメール通知**

1. **サブスクリプション開始** (`subscription_created`)
   - 新規プラン登録時の歓迎メール
   - プラン詳細、ダウンロード制限、次回請求日の案内

2. **プラン変更** (`subscription_updated`)
   - プラン変更完了時の確認メール
   - 新プランの詳細と適用日の案内

3. **サブスクリプション解約** (`subscription_cancelled`)
   - 解約完了時の確認メール
   - サービス終了日と残りダウンロード数の案内

4. **支払い成功** (`payment_succeeded`)
   - 月次/年次請求処理完了時のレシート
   - 請求書ダウンロードリンク付き

5. **支払い失敗** (`payment_failed`)
   - 決済エラー時のアラート
   - 支払い方法更新へのリンク

## 🛠️ セットアップ手順

### 1. Resend Email Serviceの設定（推奨）

#### Resendアカウント作成
1. [Resend](https://resend.com)にアクセス
2. アカウント作成・ログイン
3. **API Keys**から新しいキーを作成

#### 環境変数設定
```bash
# .envファイルに追加
RESEND_API_KEY=re_your_actual_resend_api_key
VITE_APP_URL=https://your-domain.com

# Supabase Edge Functions用
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

#### Resendダッシュボードでドメイン設定
1. **Domains**セクションでカスタムドメイン追加
2. DNS設定でMXレコード、SPF、DKIMを設定
3. ドメイン認証完了後、送信元アドレス設定

### 2. Supabase Edge Functions環境変数設定

```bash
# Supabase CLIで環境変数を設定
supabase secrets set RESEND_API_KEY=re_your_actual_api_key
supabase secrets set VITE_APP_URL=https://your-domain.com
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 設定確認
supabase secrets list
```

### 3. Edge Functionsのデプロイ

```bash
# メール送信機能をデプロイ
supabase functions deploy send-email

# Webhook関数を再デプロイ（メール送信機能追加のため）
supabase functions deploy stripe-webhook

# デプロイ確認
supabase functions list
```

### 4. メールテンプレートのカスタマイズ

`supabase/functions/send-email/index.ts`のテンプレートを編集：

```typescript
const EMAIL_TEMPLATES = {
  subscription_created: {
    subject: 'カスタムタイトル',
    html: (data: any) => `
      <!-- カスタムHTMLテンプレート -->
      <h1>${data.user_name}様</h1>
      <!-- ... -->
    `
  },
  // その他のテンプレート...
}
```

## 🧪 テスト方法

### 1. ローカルテスト

```bash
# Supabase Local Development
supabase start

# Edge Functions ローカル実行
supabase functions serve

# テストメール送信
curl -X POST 'http://localhost:54321/functions/v1/send-email' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer your_anon_key' \
  -d '{
    "to": "test@example.com",
    "template": "subscription_created",
    "data": {
      "user_name": "テストユーザー",
      "plan_name": "スタンダード"
    }
  }'
```

### 2. Stripe Webhookテスト

```bash
# Stripe CLI使用
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook

# テストイベント送信
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
```

### 3. 本番環境テスト

1. Stripeダッシュボードで実際のテスト決済実行
2. Supabase Logs機能でメール送信ログ確認
3. Resendダッシュボードで送信統計確認

## 📊 監視・ログ

### Supabase Logsでの確認

```bash
# Edge Functions ログ確認
supabase functions logs send-email
supabase functions logs stripe-webhook

# エラーログフィルタ
supabase functions logs send-email --filter "ERROR"
```

### Resend Dashboard

1. **Logs**セクションで送信履歴確認
2. **Analytics**で開封率・クリック率分析
3. **Suppressions**で配信停止リスト管理

## ⚠️ トラブルシューティング

### よくあるエラー

1. **Email service error: Forbidden**
   - ResendのAPIキーが無効
   - ドメイン認証未完了

2. **Missing email service configuration**
   - `RESEND_API_KEY`環境変数未設定
   - Supabase secretsに設定されていない

3. **メールが届かない**
   - SPAMフィルタに分類されている
   - 送信元ドメインの認証設定を確認

### ログ確認コマンド

```bash
# Edge Functions詳細ログ
supabase functions logs send-email --level debug

# Webhook処理ログ
supabase functions logs stripe-webhook --follow
```

## 🔧 カスタマイズオプション

### 1. 他のメールサービスプロバイダー使用

SendGrid、Mailgun、Amazon SESなども利用可能：

```typescript
// SendGrid例
const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${sendgridApiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(emailData),
})
```

### 2. メール配信設定

```typescript
// 配信時間設定
const sendAtTime = new Date(Date.now() + 5 * 60 * 1000) // 5分後

// 一括送信
const recipients = ['user1@example.com', 'user2@example.com']
```

### 3. A/Bテスト

```typescript
// テンプレートバリエーション
const template = Math.random() > 0.5 ? 'subscription_created_v2' : 'subscription_created'
```

## 🚀 本番環境チェックリスト

- [ ] Resendドメイン認証完了
- [ ] SPF/DKIM設定完了
- [ ] 環境変数本番用に更新
- [ ] メールテンプレート最終確認
- [ ] 送信制限・レート制限設定
- [ ] 監視・アラート設定
- [ ] 法的要件（配信停止リンク等）確認

メール通知システムの完全なセットアップにより、ユーザーエクスペリエンスが大幅に向上します！