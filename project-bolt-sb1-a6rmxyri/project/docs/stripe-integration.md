# Stripe連携 仕様書

本ドキュメントは、本プロジェクトにおけるStripe（サブスクリプション決済）連携の仕様をまとめたものです。テストモード運用、Stripe Link対応、APIルート、環境変数、DB反映、動作確認手順を記載します。

## 概要
- 決済方式: Stripe Checkout（サブスクリプション）
- 対応支払い手段: Link, カード（`payment_method_types: ['link','card']`）
- APIバージョン: `2024-06-20`
- 導線: フロントエンドからCheckoutセッションを作成 → Stripe Checkoutへリダイレクト → Webhookでサブスクリプション状態を反映 → ポータルから管理可能

## 環境変数
フロントエンド（Vite）
- `VITE_STRIPE_PUBLISHABLE_KEY`: Stripe公開鍵（テストは `pk_test_...`）
- `VITE_PRICE_STANDARD_MONTHLY`
- `VITE_PRICE_STANDARD_YEARLY`
- `VITE_PRICE_PRO_MONTHLY`
- `VITE_PRICE_PRO_YEARLY`
- `VITE_PRICE_ENTERPRISE_MONTHLY`
- `VITE_PRICE_ENTERPRISE_YEARLY`

バックエンド（API Routes / Vercel Functions）
- `STRIPE_SECRET_KEY`: Stripeシークレット鍵（テストは `sk_test_...`）
- `STRIPE_WEBHOOK_SECRET`: Webhook署名検証用（テストモードの `whsec_...`）

補足
- `.env.example` にテスト鍵の例を追記済み。
- フロント側は、公開鍵が未設定の場合のみモック動作。公開鍵が設定されていれば開発環境でもStripeテストモードを使用します。

## 画面・フロー（フロント）
主要処理は `project/src/lib/stripe.ts` に実装されています。
- `subscriptionPlans`: プラン定義（各プランのStripe価格IDを環境変数から参照、なければデフォルト）
- `StripePaymentService.createCheckoutSession(planId, billing, userId, successUrl?, cancelUrl?)`
  - `planId`: `'standard' | 'pro' | 'enterprise'`
  - `billing`: `'monthly' | 'yearly'`
  - 成功時 `{ sessionId }` を返却
  - フロントで `fetch('/api/stripe-checkout')` を呼び出してセッション作成
- `StripePaymentService.redirectToCheckout(sessionId)`
  - `@stripe/stripe-js` 経由で `redirectToCheckout` 実行
- `StripePaymentService.subscribeToPlan(planId, billing, userId)`
  - 上記2ステップを内包したヘルパー

成功/キャンセルURL
- 既定値は `window.location.origin` を元に `/payment/success`, `/payment/cancel` を利用
  - 必要に応じて `createCheckoutSession` の引数で上書き可

## API 仕様

### Checkout セッション作成: `api/stripe-checkout.ts`
- メソッド: `POST`
- リクエストBody例（JSON）
  - `priceId: string`（Stripe Price ID）
  - `userId: string`（アプリ内ユーザーID）
  - `billing: 'monthly' | 'yearly'`
  - `planId: 'standard' | 'pro' | 'enterprise'`
  - `successUrl?: string`
  - `cancelUrl?: string`
- 処理内容
  - `subscriptions` から `stripe_customer_id` を検索。ない場合はStripeにCustomerを作成
  - `stripe.checkout.sessions.create({...})`
    - `mode: 'subscription'`
    - `line_items: [{ price: priceId, quantity: 1 }]`
    - `customer: <customerId>`
    - `payment_method_types: ['link','card']` ← Linkを有効化
    - `success_url`, `cancel_url`
    - `metadata: { user_id, plan_id, billing }`
  - `checkout_sessions` テーブルに作成したセッション情報を保存
- レスポンス（200）: `{ sessionId: string }`

### Webhook: `api/stripe-webhook.ts`
- メソッド: `POST`（生ボディ、`stripe-signature` ヘッダーを使用）
- 署名検証: `stripe.webhooks.constructEvent` + `STRIPE_WEBHOOK_SECRET`
- 対応イベント
  - `checkout.session.completed`
    - `subscriptions` テーブルへ `user_id`, `stripe_customer_id`, `stripe_subscription_id`, `plan`, `status='active'`, `monthly_download_limit` などを反映（`plan` はメタデータの `plan_id`）
  - `customer.subscription.updated | created | deleted`
    - Stripeサブスクの状態に応じ、`subscriptions` の `status`/`current_period_*`/`cancel_at_period_end` を更新
    - `checkout_sessions` の `status` を `completed` に更新（ユーザー紐付けが取れた場合）
- レスポンス（200）: `{ received: true }`

### カスタマーポータル: `api/stripe-portal.ts`
- メソッド: `POST`
- リクエストBody: `{ customerId: string, returnUrl?: string }`
- 処理内容
  - `stripe.billingPortal.sessions.create({ customer, return_url })`
- レスポンス（200）: `{ url: string }`（ポータルURL）

## DB 仕様（抜粋）
関連テーブル定義は `project/database/schema.sql` を参照。
- `subscriptions`
  - `user_id`, `stripe_customer_id`, `stripe_subscription_id`, `plan`, `status`, `current_period_start`, `current_period_end`, `monthly_download_limit`, `cancel_at_period_end` 等
- `checkout_sessions`
  - `session_id`, `user_id`, `price_id`, `customer_id`, `billing_cycle`, `plan_id`, `status`, `created_at`, `completed_at`
- `payment_history`
  - 現状は支払いIntentの履歴保持用テーブル（Webhook側では主に `subscriptions`/`checkout_sessions` を更新）

## テストモード運用（Link含む）
1) Stripeダッシュボード（テストモード）で価格IDを作成し、環境変数 `VITE_PRICE_*` に設定
2) フロント `.env.local` 等に `VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...` を設定
3) バックエンド環境に `STRIPE_SECRET_KEY=sk_test_...`, `STRIPE_WEBHOOK_SECRET=whsec_...` を設定
4) Linkを有効化（ダッシュボード > Payment methodでLinkを有効に）
5) Webhook転送（ローカル例）
   - `stripe listen --forward-to http://<ローカルホスト>/api/stripe-webhook`
   - 開発サーバのURL/ポートに合わせて変更
6) 料金プランから購入フローへ進み、CheckoutでLink/カード（テスト用）を利用
7) 決済完了後、Webhookで `subscriptions`/`checkout_sessions` が更新されることを確認

補足
- フロントは「公開鍵が未設定の時のみモック」。公開鍵を設定すれば、開発中でもStripeテストモードの実フロー（Checkout + Link）が動作します。
- 成功/キャンセルURLは `req.headers.origin`/`window.location.origin` ベースの既定値を利用。

## セキュリティ/留意事項
- シークレット鍵はフロントに絶対出さない（バックエンド/ホスティング環境に設定）
- Webhookの署名検証は必須（本実装は `stripe.webhooks.constructEvent` で検証）
- `metadata.user_id` によりアプリ内ユーザーをトレース
- 価格IDはテスト/本番で別管理（環境変数で切替）

## 既知の仕様/改善候補
- `payment_history` 連携は最小限。必要に応じてInvoice/PaymentIntentの詳細保存・DLリンク更新などを強化可能
- Idempotency-Key 未利用。多重リクエスト対策が必要なら導入検討
- `schema.sql` に重複定義が見られる箇所あり（クリーンアップ候補）

## 参照ファイル
- API
  - `project/api/stripe-checkout.ts`
  - `project/api/stripe-webhook.ts`
  - `project/api/stripe-portal.ts`
- フロント
  - `project/src/lib/stripe.ts`
- 環境変数サンプル
  - `project/.env.example`
- スキーマ
  - `project/database/schema.sql`

