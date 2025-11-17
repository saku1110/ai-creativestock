# メール配信セットアップ（お名前メール・SMTP）

## 1. 送信するメールの種類

| テンプレート | 用途 |
| --- | --- |
| `subscription_created` | 新規サブスク開始通知 |
| `subscription_updated` | プラン変更通知 |
| `subscription_cancelled` | 解約完了通知 |
| `payment_succeeded` | 決済成功通知 |
| `payment_failed` | 決済失敗／再試行の案内 |
| `video_request` | 動画リクエスト受付（フロント側モーダル） |
| `contact` | お問い合わせフォーム |

上記はすべて SMTP（お名前メール）経由で送信します。外部メール API には依存しません。

## 2. 必要情報の整理

| 項目 | 例 |
| --- | --- |
| `SMTP_HOST` | `smtp01.onamae.com` |
| `SMTP_PORT` | `465`（SSL/TLS） |
| `SMTP_SECURE` | `true` |
| `SMTP_USER` | `info@ai-creativestock.com` |
| `SMTP_PASS` | お名前メールで発行したアプリパスワード |
| `SMTP_FROM_EMAIL` | `noreply@ai-creativestock.com` |
| `CONTACT_TO_EMAIL` | `support@ai-creativestock.com` |

> **メモ**  
> - From ドメインは SPF / DKIM を DNS に登録しておくと迷惑メールに入りづらくなります。  
> - お名前メールは 587/STARTTLS も使えますが、465/TLS の方が安定しています。

## 3. 環境変数

### 3-1. Vite / Vercel 用 `.env`

```env
SMTP_HOST=smtp01.onamae.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=info@ai-creativestock.com
SMTP_PASS=your_app_password
SMTP_FROM_EMAIL=noreply@ai-creativestock.com
CONTACT_TO_EMAIL=request@ai-creativestock.com
CONTACT_FROM_EMAIL=noreply@ai-creativestock.com
SUPPORT_EMAIL=support@ai-creativestock.com
VIDEO_REQUEST_TO_EMAIL=request@ai-creativestock.com
VIDEO_REQUEST_FROM_EMAIL=noreply@ai-creativestock.com
VIDEO_REQUEST_SLACK_WEBHOOK_URL=
```

`VIDEO_REQUEST_*` を設定しておくと、Vercel の `/api/video-request` から直接お名前メール SMTP で送信できます。未設定の場合は `CONTACT_TO_EMAIL` / `CONTACT_FROM_EMAIL` が自動的に使われます。

### 3-2. Supabase Edge Functions の secrets

```bash
supabase secrets set SMTP_HOST=smtp01.onamae.com
supabase secrets set SMTP_PORT=465
supabase secrets set SMTP_SECURE=true
supabase secrets set SMTP_USER=info@ai-creativestock.com
supabase secrets set SMTP_PASS=your_app_password
supabase secrets set SMTP_FROM_EMAIL=noreply@ai-creativestock.com
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
supabase secrets list
```

## 4. デプロイ手順

```bash
# Edge Function（メール送信）をデプロイ
supabase functions deploy send-email

# Stripe Webhook も同じ secrets を参照するため再デプロイ
supabase functions deploy stripe-webhook
```

フロントエンド／API 側は Vercel に push すれば自動デプロイされます。必要に応じて `vercel env pull` / `vercel env add` で同じ SMTP 系の環境変数を登録してください。

## 5. 動作確認

### 5-1. Supabase ローカル

```bash
supabase start
supabase functions serve --env-file ./supabase/.env

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

### 5-2. Stripe CLI

```bash
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
```

### 5-3. Vercel Functions

```bash
curl -X POST 'https://<your-vercel-domain>/api/contact' \
  -H 'Content-Type: application/json' \
  -d '{"name":"テスト","from_email":"user@example.com","subject":"動作確認","message":"Hello"}'
```

## 6. トラブルシューティング

| 症状 | 確認ポイント |
| --- | --- |
| `Missing SMTP configuration` | Supabase / Vercel の環境変数に `SMTP_*` が入っているか |
| `SMTP error: Authentication failed` | お名前メールのパスワード / 2段階認証用アプリパスワードを再発行 |
| タイムアウトする | ポートを 465 → 587 に変えて `SMTP_SECURE=false` + `STARTTLS`（nodemailer は自動判定） |
| 受信できない | SPF / DKIM / DMARC が正しく設定されているか、迷惑メールフォルダを確認 |

ログ確認コマンド:

```bash
supabase functions logs send-email --follow
supabase functions logs stripe-webhook --filter "ERROR"
```

Vercel 側は `vercel logs <deployment-url>` を参照してください。

## 7. チェックリスト

- [ ] SMTP 資格情報をお名前.com で確認
- [ ] `.env` と Supabase secrets に `SMTP_*` を登録
- [ ] `CONTACT_TO_EMAIL` / `CONTACT_FROM_EMAIL` / `SUPPORT_EMAIL` を設定
- [ ] Supabase `send-email` / `stripe-webhook` を再デプロイ
- [ ] Vercel API（`/api/contact` など）でテスト送信
- [ ] SPF / DKIM / DMARC を DNS に追加
- [ ] 本番ドメインで実送信テスト

これで外部メール API への依存を完全に排除し、お名前メール（SMTP）のみで全ての通知メールを送れる状態になります。
