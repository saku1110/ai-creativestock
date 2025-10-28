# Google認証と管理者アップロード機能の設定ガイド

このドキュメントでは、AI Creative StockでGoogle認証と管理者による動画アップロード機能を有効にする手順を説明します。

## 1. Google Cloud Console設定

### Google Cloud Consoleアクセス
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成または既存のプロジェクトを選択
3. プロジェクトが選択されていることを確認

### OAuth 2.0設定
1. **APIs & Services** → **認証情報** を開く
2. **認証情報を作成** → **OAuth 2.0 クライアント ID** を選択
3. **アプリケーションの種類** で **ウェブアプリケーション** を選択
4. **名前** に適切な名前を入力（例：AI Creative Stock）

### 承認済みのJavaScript生成元
以下のURLを追加：
```
http://localhost:5173
https://yourdomain.com
```

### 承認済みのリダイレクトURI
以下のURLを追加：
```
https://YOUR_SUPABASE_URL/auth/v1/callback
```

例：
```
https://abcdefghijk.supabase.co/auth/v1/callback
```

### 認証情報の保存
- **クライアントID** をコピー
- **クライアントシークレット** をコピー

## 2. Supabase設定

### Supabase Dashboard
1. [Supabase Dashboard](https://app.supabase.com/) にアクセス
2. プロジェクトを選択
3. **Authentication** → **Settings** → **Auth** タブを開く

### Google Provider設定
1. **Auth providers** セクションで **Google** を見つける
2. **Enable Google provider** を **ON** にする
3. 以下の情報を入力：
   - **Client ID**: Google Cloud ConsoleのクライアントID
   - **Client Secret**: Google Cloud Consoleのクライアントシークレット
   - **Redirect URL**: 自動入力される（確認のみ）

### 追加設定
- **Allow unverified email sign-ins**: OFF（推奨）
- **Auto-confirm users**: ON（任意）

## 3. 環境変数設定

### .env.local ファイル
プロジェクトルートに `.env.local` を作成：

```env
# Supabase設定
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY

# Google OAuth設定（オプション）
VITE_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
```

## 4. 開発環境での設定

### localhost設定
Google Cloud Consoleで承認済みのJavaScript生成元に以下を追加：
```
http://localhost:5173
http://localhost:3000
```

### 開発サーバー起動
```bash
npm run dev
```

## 5. 本番環境での設定

### ドメイン設定
1. Google Cloud Consoleで本番ドメインを追加
2. SSL証明書が有効であることを確認
3. HTTPSでのみ動作することを確認

### 本番環境URL例
```
https://yourdomain.com
https://www.yourdomain.com
```

## 6. テスト方法

### 動作確認
1. `npm run dev` でサーバーを起動
2. `http://localhost:5173/` にアクセス
3. **ログイン**ボタンをクリック
4. **Googleでログイン・新規登録**をクリック
5. Googleのログイン画面が表示されることを確認

### 成功時の動作
- Googleログイン画面が表示される
- ログイン後、アプリケーションにリダイレクト
- ダッシュボードが表示される
- ユーザー情報が正しく取得される

## 7. トラブルシューティング

### よくあるエラー

**Error: redirect_uri_mismatch**
```
解決方法: Google Cloud ConsoleのリダイレクトURIを確認
正しいURL: https://YOUR_SUPABASE_URL/auth/v1/callback
```

**Error: unauthorized_client**
```
解決方法: JavaScript生成元のURLを確認
開発環境: http://localhost:5173
本番環境: https://yourdomain.com
```

**Error: popup_closed_by_user**
```
解決方法: ポップアップブロッカーを無効にする
または、ブラウザの設定でポップアップを許可
```

**Error: Invalid provider**
```
解決方法: SupabaseでGoogleプロバイダーが有効になっているか確認
Authentication → Settings → Auth → Google
```

### デバッグ方法

**ブラウザコンソールで確認**
```javascript
// Supabase設定の確認
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Supabase Anon Key:', import.meta.env.VITE_SUPABASE_ANON_KEY);
```

**認証状態の確認**
```javascript
// 認証状態の確認
import { auth } from './lib/supabase';
auth.getCurrentUser().then(({ user, error }) => {
  console.log('Current user:', user);
  console.log('Error:', error);
});
```

## 8. セキュリティ設定

### 推奨設定
- OAuth認証後のリダイレクトURLを制限
- 定期的なクライアントシークレットの更新
- 不要なスコープの削除
- ドメインの検証

### スコープ設定
デフォルトで以下のスコープが使用されます：
- `openid`
- `email`
- `profile`

## 9. 設定確認チェックリスト

### Google Cloud Console
- [ ] OAuth 2.0 クライアントIDを作成
- [ ] JavaScript生成元にドメインを追加
- [ ] リダイレクトURIにSupabaseのコールバックURLを追加
- [ ] クライアントIDとシークレットを取得

### Supabase
- [ ] GoogleプロバイダーをONにする
- [ ] クライアントIDとシークレットを入力
- [ ] リダイレクトURLを確認

### 環境変数
- [ ] .env.localファイルを作成
- [ ] VITE_SUPABASE_URLを設定
- [ ] VITE_SUPABASE_ANON_KEYを設定

### 動作確認
- [ ] 開発サーバーを起動
- [ ] Googleログインボタンをクリック
- [ ] Googleログイン画面が表示される
- [ ] ログイン後、ダッシュボードが表示される

## 10. データベースの設定

### 管理者テーブルの作成
Supabaseの「SQL Editor」で以下のSQLを実行：

```sql
-- 管理者ユーザーテーブル
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'admin',
  permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- RLSポリシーを有効化
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- 管理者のみがアクセスできるポリシー
CREATE POLICY "Admin users can view admin_users" ON admin_users
  FOR SELECT USING (auth.uid() IN (SELECT user_id FROM admin_users));

CREATE POLICY "Admin users can insert admin_users" ON admin_users
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM admin_users WHERE role = 'super_admin'));
```

### 動画アセットテーブルの作成
```sql
-- 動画アセットテーブル
CREATE TABLE IF NOT EXISTS video_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  duration INTEGER NOT NULL,
  resolution TEXT NOT NULL,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  is_featured BOOLEAN DEFAULT FALSE,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLSポリシーを有効化
ALTER TABLE video_assets ENABLE ROW LEVEL SECURITY;

-- 誰でも動画を閲覧可能
CREATE POLICY "Anyone can view video_assets" ON video_assets
  FOR SELECT USING (true);

-- 管理者のみが挿入・更新・削除可能
CREATE POLICY "Admin users can insert video_assets" ON video_assets
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM admin_users));

CREATE POLICY "Admin users can update video_assets" ON video_assets
  FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM admin_users));

CREATE POLICY "Admin users can delete video_assets" ON video_assets
  FOR DELETE USING (auth.uid() IN (SELECT user_id FROM admin_users));
```

## 11. ストレージバケットの設定

### バケットの作成
Supabaseダッシュボードで「Storage」に移動し、以下のバケットを作成：

1. `video-assets`バケット：
   - Public: Yes（公開アクセス可能）
   - File size limit: 100MB
   - Allowed MIME types: `video/*`

### バケットポリシーの設定
```sql
-- 誰でも動画を閲覧可能
CREATE POLICY "Anyone can view videos" ON storage.objects
  FOR SELECT USING (bucket_id = 'video-assets');

-- 管理者のみがアップロード可能
CREATE POLICY "Admin users can upload videos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'video-assets' AND
    auth.uid() IN (SELECT user_id FROM admin_users)
  );

-- 管理者のみが削除可能
CREATE POLICY "Admin users can delete videos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'video-assets' AND
    auth.uid() IN (SELECT user_id FROM admin_users)
  );
```

## 12. 最初の管理者を追加

1. Google認証でログイン
2. Supabaseダッシュボードで「Authentication」→「Users」から自分のユーザーIDを確認
3. SQL Editorで以下を実行（YOUR_USER_IDを実際のIDに置き換え）：

```sql
INSERT INTO admin_users (user_id, role, permissions)
VALUES ('YOUR_USER_ID', 'super_admin', ARRAY['all']);
```

## 13. 管理者アップロード機能の使用

### 管理者としてアクセス
1. Google認証でログイン
2. `/admin/upload`にアクセス
3. AdminUploadコンポーネントが表示される

### アップロード機能
- 動画ファイル（100MB以下）
- サムネイル画像（10MB以下）
- メタデータ入力（タイトル、説明、カテゴリ、タグ）
- ウォーターマーク処理（オプション）
- CSRF保護付きの安全なアップロード

これらの設定が完了すると、Google認証と管理者による動画アップロード機能が正常に動作するようになります。