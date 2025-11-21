# Login Flow Notes

## フロー概要
- URLのクエリ + ハッシュから `access_token` / `refresh_token` / `mode(registration|login)` を取得。
- `mode === registration` のとき新規登録扱いで一時フラグを立て、成功時はpricingに寄せる。
- `supabase.auth.setSession` を呼び、失敗時はエラー表示してローディング解除。
- dev環境は認証フェッチをスキップしてLPへ。
- トークンなしなら即LPへ。
- `auth.getCurrentUser` でユーザーが取れたら、プロバイダが許可されているかチェックし、ダッシュボード/LPへ振り分ける。
- `onAuthStateChange` でも同判定を再実行し、isNewUserフラグをリセットする。

## ログアウト
- UI状態を先にリセット（`isLoggedIn=false` など）してLPへ。
- `auth.signOut()` を試行。
- `localStorage`/`sessionStorage` の `sb-` / `supabase` キーを削除。
- 最後に `/` へリダイレクト。

## よくあるハマりポイントと対処
- トークン/Anon Key/URL不一致 → `auth/v1/token` が 401/403。環境変数を発行元と揃える。
- 古いセッションが残る → ブラウザの `sb-`/`supabase` キーを手動削除。
- setSession失敗で固まる → 現行コードは失敗時にローディング解除＋エラー表示。
- ハッシュに `#access_token=...` が残ったURLをブックマークしていると再認証されるので注意。

## 環境変数（本番）
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` は、アクセストークン発行元のSupabaseプロジェクトと一致させる。
- ずれがあると setSession が必ず失敗する。
