# Stripe Checkout 導入ガイド（学生向け）

このドキュメントは、`project/` ディレクトリにある Vite + Vercel + Supabase 構成のアプリへ Stripe Checkout（サブスクリプション決済）を組み込むための手順を、できるだけ平易な言葉でまとめたものです。ざっくり言えば「ユーザーが料金プランを選ぶ → Stripe の支払い画面に行く → 決済が終わったら Supabase の `subscriptions` テーブルを更新して権限を付ける」という流れです。

---

## 0. 全体の見取り図

1. **フロントエンド**（`src/components/PricingPage.tsx` など）で「プランを購入」ボタンを押す。
2. `src/lib/stripe.ts` 内の `stripeService.createCheckoutSession` が `fetch('/api/stripe-checkout')` を呼び出し、Vercel Function (`api/stripe-checkout.ts`) が Stripe に Session を作成。
3. Stripe が用意する Checkout 画面にリダイレクトされ、利用者が決済。
4. 決済完了時、Stripe → `api/stripe-webhook.ts`（Vercel Function）にイベントが届き、Supabase の `subscriptions` / `checkout_sessions` テーブルが更新される。
5. アプリでは `subscriptions.status === 'active'` かどうかでダウンロード数などの権限を制御。

---

## 1. 事前に準備するもの

| 目的 | 具体的な作業 |
| --- | --- |
| Stripe アカウント | https://dashboard.stripe.com/ で登録。会社情報・銀行口座も本番前に入力する。 |
| Supabase プロジェクト | 既存プロジェクトを利用。`SUPABASE_URL` と **Service Role Key** を確認。 |
| Stripe CLI（ローカル開発用） | `npm install -g stripe-cli` もしくは公式バイナリをインストール。 |
| Node.js 20.x | `project/package.json` の `engines.node` に合わせる。 |

> すべて整ったら `cd project-bolt-sb1-a6rmxyri/project` でこのプロジェクトに入ります。

---

## 2. 環境変数を設定する

### 2-1. ローカル（テストモード）  
`.env.example` をコピーして `.env.local` を作り、次を追加/書き換えます。  
（**git にコミットしない**よう `.gitignore` で保護されています）

```bash
# Stripe（テストモード）
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# プランごとの価格ID（Stripe Dashboard > Products で作成した Price ID）
VITE_PRICE_STANDARD_MONTHLY=price_xxxxx
VITE_PRICE_STANDARD_YEARLY=price_xxxxx
VITE_PRICE_PRO_MONTHLY=price_xxxxx
VITE_PRICE_PRO_YEARLY=price_xxxxx
VITE_PRICE_ENTERPRISE_MONTHLY=price_xxxxx
VITE_PRICE_ENTERPRISE_YEARLY=price_xxxxx

# Supabase 管理者クライアント用
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=サービスロールキー
```

フロントエンド（Vite）は `VITE_` から始まる値だけを参照します。バックエンドの Vercel Functions は `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `SUPABASE_*` を使います。

### 2-2. Vercel / Supabase Edge Function（本番）

1. **Vercel Dashboard > Project > Settings > Environment Variables** に上記と同じキーを登録。`Development`/`Preview`/`Production` でテスト鍵と本番鍵を分けられます。
2. Supabase Edge Functions（`supabase/functions/*`）で Stripe を使う場合は `supabase secrets set STRIPE_SECRET_KEY=...` のように登録。

---

## 3. Stripe ダッシュボードで商品と価格IDを作る

1. Stripe Dashboard の左メニュー **Products** → **Add product**。
2. プロジェクトの料金プラン（Standard / Pro / Enterprise）ごとに商品を作成。
3. それぞれ「定期支払い（Recurring）」で月額・年額の Price を作る。
4. 作成後に表示される `price_xxx` を `VITE_PRICE_*` 環境変数へ控える。

> `src/lib/stripe.ts` 内の `subscriptionPlans` で `VITE_PRICE_*` を参照します。環境変数が空の場合はデフォルト値（ダミー）で動くため、本番リリース前に必ず上書きしてください。

---

## 4. サーバーレス（Vercel Functions）の確認

| ルート | 役割 | 使う主な環境変数 |
| --- | --- | --- |
| `api/stripe-checkout.ts` | Checkout Session を発行 | `STRIPE_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` |
| `api/stripe-webhook.ts` | 決済完了イベントを受けて Supabase 更新 | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_*` |
| `api/stripe-portal.ts` | 既存ユーザー向けカスタマーポータルURLを作成 | `STRIPE_SECRET_KEY` |

**やること**

1. `.env.local` を読み込むために `npm install && npm run dev` を実行。  
2. `curl -X POST http://localhost:4173/api/stripe-checkout ...` のように叩き、`{ sessionId: ... }` が返るかチェック。  
   - リクエスト例: `{"priceId":"price_xxx","userId":"<Supabase user id>","planId":"standard","billing":"monthly"}`  
3. `api/_supabaseAdmin.ts` が `SUPABASE_SERVICE_KEY` を要求するので、環境変数を忘れず設定。  
4. Vercel にデプロイするときは `vercel env pull` で `.env.local` を同期しておくと便利。

---

## 5. Webhook をセットアップする

### ローカルでのテスト

```bash
stripe login             # 1回やればOK
stripe listen --forward-to localhost:4173/api/stripe-webhook
```

`stripe listen` を実行すると `whsec_...` が表示されるので、それを `.env.local` の `STRIPE_WEBHOOK_SECRET` に貼り付けます。これでテスト決済後に Supabase の `subscriptions`／`checkout_sessions` が更新されます。

### 本番（Vercel）での受信

1. Stripe Dashboard > **Developers** > **Webhooks** > **Add endpoint**。  
2. URL に `https://<your-vercel-domain>/api/stripe-webhook` を入力。  
3. イベントは少なくとも `checkout.session.completed`, `customer.subscription.created/updated/deleted` を選択。必要であれば `invoice.payment_*` も加える。  
4. 発行された本番用 `whsec_...` を Vercel の Production 環境変数に登録。

---

## 6. Supabase 側のテーブルを整える

`project/database/schema.sql` と `database/migrations/` に `subscriptions`, `checkout_sessions`, `payment_history` などの定義が入っています。初期セットアップ時は次を実行して最新スキーマを反映します。

```bash
supabase db reset         # 既存データが消えるので注意
# もしくは
supabase db push          # 変更差分のみを適用
```

実運用では `subscriptions.status` と `monthly_download_limit` が利用される想定です。Stripe から届く `plan_id`（`metadata.plan_id`）と Supabase 側のプラン ID を合わせておきましょう。

---

## 7. フロントエンドから決済を呼び出す

主要なファイルは `src/lib/stripe.ts` です。

1. `getStripe()` が `VITE_STRIPE_PUBLISHABLE_KEY` を読んで `@stripe/stripe-js` を初期化。キーが空ならモック挙動になります。  
2. `stripeService.subscribeToPlan(planId, billing, userId)` を使うと  
   - `api/stripe-checkout` に POST  
   - `stripe.redirectToCheckout` で Stripe 画面へ移動  
   …までをまとめて実行してくれます。
3. `src/components/PricingPage.tsx` や `TrialRegistrationModal.tsx` では上記メソッドをすでに呼んでいるので、プラン ID とユーザー ID が正しく渡っていれば UI 側の追加実装はほぼ不要です。
4. 成功時の遷移先（`/payment/success`）やキャンセル時 URL（`/payment/cancel`）を変えたい場合は、`createCheckoutSession` の第4・第5引数で差し替え可能。

---

## 8. 動作確認の手順

1. `npm run dev` を実行し、ブラウザで `http://localhost:4173` を開く。  
2. Supabase Auth でユーザー登録 → ログイン。  
3. 料金プランページから `プランを選択` ボタンを押す。  
4. Stripe Checkout 画面でテストカード（例: `4242 4242 4242 4242`, 期限 12/34, CVC 123）で決済する。  
5. Stripe CLI のログとターミナルの `stripe-webhook` ログを確認し、`subscriptions` に行が入ったか Supabase Studio で確認。  
6. `/mypage` やダウンロード数制限の UI が `status: active` を認識しているか確認。

---

## 9. 本番切り替え時のチェックリスト

1. Stripe Dashboard の右上トグルを **テストモード → 本番モード** に切り替えてから、公開鍵/秘密鍵/価格ID/Webhookシークレットの **Live 値** を控える。  
2. Vercel の Production 環境変数を Live 値へ更新。`vercel redeploy` で反映。  
3. Supabase Edge Functions や Secrets を更新し直す。  
4. Stripe Webhook の URL が `https://your-prod-domain/api/stripe-webhook` になっているか確認。  
5. 成功/キャンセルURLも本番ドメインに変更済みか確認（必要なら `STRIPE_SUCCESS_URL` などを環境変数化して `api/stripe-checkout.ts` に渡す）。  
6. 実際のカードで小額決済 → 返金テストを行い、記帳まで確認。

---

## 10. よくあるつまずき

| 症状 | 確認ポイント |
| --- | --- |
| `Stripe公開可能キーが未設定` の警告 | `.env.local` の `VITE_STRIPE_PUBLISHABLE_KEY` を確認。Vite を再起動。 |
| `Missing STRIPE_SECRET_KEY` エラーでビルドが落ちる | Vercel/Supabase にバックエンド用キーを入れ忘れていないか。 |
| Checkout セッションが作れない | 渡している `priceId` が Stripe Dashboard の Price ID と一致しているか、`billing` / `planId` が `subscriptionPlans` の定義とずれていないか。 |
| Webhook で `signature verification failed` | `stripe listen` が発行した `whsec_...` を使っているか。複数ターミナルで listen した場合は最新のものに更新する。 |
| Supabase に行が入らない | `subscriptions` テーブルが最新スキーマか (`supabase db push`)、Service Role Key が有効か確認。 |

---

## 11. もっと学びたい人へ

- Stripe 公式ドキュメント（日本語）: https://stripe.com/docs/payments/checkout  
- Stripe CLI チュートリアル: https://stripe.com/docs/stripe-cli  
- Supabase Functions から Stripe を触る例: `supabase/functions/stripe-*`（必要に応じて参照）  
- このリポジトリ内のより詳しい仕様書: `docs/stripe-integration.md`

これで Stripe Checkout を導入する準備は完了です。わからないところは上のファイルや Stripe/Supabase ダッシュボードを往復しながら、一歩ずつ進めていけば必ず動きます。頑張ってください！

