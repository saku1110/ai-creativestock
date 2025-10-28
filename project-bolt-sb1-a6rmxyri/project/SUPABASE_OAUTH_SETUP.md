# Supabase OAuth設定ガイド

GoogleログインとApple IDログインを有効にするには、Supabaseの管理画面で設定が必要です。

## 1. Supabase管理画面での設定

### Supabase Dashboardにアクセス
1. [https://app.supabase.com/](https://app.supabase.com/) にアクセス
2. プロジェクトを選択
3. 「Authentication」→「Settings」→「Auth」タブを開く

## 2. Google OAuth設定

### Google Cloud Consoleでの設定
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成または既存のプロジェクトを選択
3. 「APIs & Services」→「認証情報」を開く
4. 「認証情報を作成」→「OAuth 2.0 クライアント ID」を選択
5. アプリケーションタイプで「ウェブアプリケーション」を選択
6. 承認済みのJavaScript生成元に以下を追加:
   ```
   http://localhost:5173 (開発環境)
   https://yourdomain.com (本番環境)
   ```
7. 承認済みのリダイレクトURIに以下を追加:
   ```
   https://YOUR_SUPABASE_URL/auth/v1/callback
   ```

### Supabaseでの設定
1. Supabase Dashboard → Authentication → Settings → Auth
2. 「Google」セクションで以下を設定:
   - **Enable Google provider**: ON
   - **Client ID**: Google Cloud ConsoleのクライアントID
   - **Client Secret**: Google Cloud Consoleのクライアントシークレット
   - **Redirect URL**: `https://YOUR_SUPABASE_URL/auth/v1/callback`

## 3. Apple ID OAuth設定

### Apple Developer Accountでの設定
1. [Apple Developer Portal](https://developer.apple.com/) にアクセス
2. 「Certificates, Identifiers & Profiles」を開く
3. 「Services IDs」を作成
4. 「Sign in with Apple」を有効にする
5. ドメインとリダイレクトURLを設定:
   ```
   Primary App ID: com.example.yourapp
   Domains: yourdomain.com
   Return URLs: https://YOUR_SUPABASE_URL/auth/v1/callback
   ```

### Supabaseでの設定
1. Supabase Dashboard → Authentication → Settings → Auth
2. 「Apple」セクションで以下を設定:
   - **Enable Apple provider**: ON
   - **Client ID**: Apple Developer PortalのServices ID
   - **Client Secret**: Apple Developer Portalで生成した秘密鍵
   - **Redirect URL**: `https://YOUR_SUPABASE_URL/auth/v1/callback`

## 4. 環境変数の設定

`.env.local`ファイルに以下を追加:

```env
# Supabase設定
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# OAuth設定
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_APPLE_CLIENT_ID=your-apple-client-id
```

## 5. 開発環境での設定

### localhost用の設定
開発環境（localhost:5173）で動作させるために:

1. Google Cloud Consoleで承認済みのJavaScript生成元に追加:
   ```
   http://localhost:5173
   ```

2. Apple Developer Portalでのドメイン設定:
   - 開発環境ではApple IDログインが制限される場合があります
   - 本番環境でのテストが推奨されます

## 6. トラブルシューティング

### よくあるエラーと解決方法

**Google認証エラー**
```
Error: popup_closed_by_user
解決方法: ポップアップブロッカーを無効にする
```

**Apple認証エラー**
```
Error: configuration
解決方法: Apple Developer Portalの設定を確認
```

**Supabase設定エラー**
```
Error: Invalid redirect URL
解決方法: リダイレクトURLの設定を確認
```

### 設定確認方法

1. **Google OAuth設定の確認**
   ```javascript
   // ブラウザの開発者ツールで確認
   console.log('Google Client ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID);
   ```

2. **Apple OAuth設定の確認**
   ```javascript
   // ブラウザの開発者ツールで確認
   console.log('Apple Client ID:', import.meta.env.VITE_APPLE_CLIENT_ID);
   ```

3. **Supabase認証の確認**
   ```javascript
   // ブラウザの開発者ツールで確認
   console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
   ```

## 7. 本番環境での設定

### ドメイン設定
1. Google Cloud Consoleで本番ドメインを追加
2. Apple Developer Portalで本番ドメインを追加
3. Supabaseで本番環境のリダイレクトURLを設定

### SSL/HTTPS設定
- 本番環境では必ずHTTPS接続を使用
- OAuth認証はHTTPS環境でのみ動作

## 8. セキュリティ設定

### 推奨設定
- OAuth認証後のリダイレクトURLを制限
- 認証スコープを最小限に設定
- 定期的なクライアントシークレットの更新

これらの設定を完了すると、GoogleログインとApple IDログインが正常に動作するようになります。