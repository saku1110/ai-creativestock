# Apple ID認証設定ガイド

SupabaseでApple ID認証を有効にするための詳細な設定手順です。

## 1. Apple Developer Account設定

### Apple Developer Portalアクセス
1. [Apple Developer Portal](https://developer.apple.com/) にアクセス
2. Apple Developer Accountでログイン
3. **Certificates, Identifiers & Profiles** を選択

### Services ID作成
1. **Identifiers** セクションで **Services IDs** を選択
2. **+** ボタンをクリックして新しいServices IDを作成
3. **Services IDs** を選択して **Continue**

### Services ID設定
1. **Description**: アプリケーション名（例：AI Creative Stock）
2. **Identifier**: リバースドメイン形式（例：com.example.aicreativestock）
3. **Register** をクリック

### Sign in with Apple設定
1. 作成したServices IDを選択
2. **Sign in with Apple** にチェック
3. **Configure** をクリック

### ドメインとリダイレクトURL設定
1. **Primary App ID**: 既存のApp IDを選択または新規作成
2. **Website URLs** セクションで以下を設定：
   - **Domains**: `yourdomain.com`
   - **Return URLs**: `https://xwwvjoqiicwrjzvzjqju.supabase.co/auth/v1/callback`

### 開発環境用の設定
開発環境（localhost）では以下の制限があります：
- Apple IDログインは **HTTPS必須**
- localhostでは動作しない場合が多い
- 開発時はテスト用のhttpsドメインが必要

## 2. 秘密鍵の生成

### 秘密鍵作成
1. Apple Developer Portalで **Keys** セクションを選択
2. **+** ボタンをクリックして新しいキーを作成
3. **Key Name**: 適切な名前を入力
4. **Sign in with Apple** にチェック
5. **Configure** をクリック

### 秘密鍵設定
1. **Primary App ID**: 先ほど作成したApp IDを選択
2. **Register** をクリック
3. **Download** をクリックして秘密鍵ファイル（.p8）をダウンロード
4. **Key ID** をメモしておく

## 3. Supabase設定

### Supabase Dashboard
1. [Supabase Dashboard](https://app.supabase.com/) にアクセス
2. プロジェクトを選択
3. **Authentication** → **Settings** → **Auth** タブを開く

### Apple Provider設定
1. **Auth providers** セクションで **Apple** を見つける
2. **Enable Apple provider** を **ON** にする
3. 以下の情報を入力：
   - **Client ID**: Apple Developer PortalのServices ID
   - **Client Secret**: JWT形式で生成する必要があります（下記参照）
   - **Redirect URL**: 自動入力される（確認のみ）

### Client Secret生成
Apple認証では、秘密鍵を使ってJWTトークンを生成する必要があります。

#### 必要な情報
- **Key ID**: Apple Developer Portalで取得
- **Team ID**: Apple Developer Portalで確認
- **Client ID**: Services IDのIdentifier
- **Private Key**: ダウンロードした.p8ファイルの内容

#### JWT生成ツール
オンラインのJWT生成ツールまたはコマンドラインツールを使用：

```bash
# Node.jsを使用したJWT生成例
const jwt = require('jsonwebtoken');
const fs = require('fs');

const privateKey = fs.readFileSync('path/to/your/private-key.p8', 'utf8');

const payload = {
  iss: 'YOUR_TEAM_ID',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 86400 * 180, // 6ヶ月後
  aud: 'https://appleid.apple.com',
  sub: 'YOUR_CLIENT_ID'
};

const token = jwt.sign(payload, privateKey, {
  algorithm: 'ES256',
  header: {
    kid: 'YOUR_KEY_ID'
  }
});

console.log(token);
```

## 4. 環境変数設定

### .env.local ファイル
```env
# Supabase設定
VITE_SUPABASE_URL=https://xwwvjoqiicwrjzvzjqju.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3d3Zqb3FpaWN3cmp6dnpqcWp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyMjI5MjgsImV4cCI6MjA2Nzc5ODkyOH0.alBDRRM5QoLo4hUndmttu4mZVGIc6oENEG7wRKSXaz8

# Apple OAuth設定（オプション）
VITE_APPLE_CLIENT_ID=com.example.aicreativestock
```

## 5. 開発環境での制限

### HTTPS要件
Apple ID認証は **HTTPS必須** です：
- `localhost` では動作しません
- 開発時は以下のような方法が必要：
  - **ngrok** を使用してHTTPSトンネルを作成
  - **Vercel** などの無料ホスティングサービスを使用
  - **自己署名証明書** を使用したローカルHTTPS

### ngrokを使用した開発例
```bash
# ngrokをインストール
npm install -g ngrok

# 開発サーバーを起動
npm run dev

# 別のターミナルでngrokを起動
ngrok http 5173
```

## 6. 本番環境での設定

### ドメイン設定
1. Apple Developer Portalで本番ドメインを設定
2. SSL証明書が有効であることを確認
3. HTTPSでのアクセスを確認

### 本番環境URL例
```
https://yourdomain.com
https://www.yourdomain.com
```

## 7. テスト方法

### 動作確認
1. HTTPS環境でアプリケーションを起動
2. **Apple IDでログイン・新規登録**ボタンをクリック
3. Apple IDログイン画面が表示されることを確認
4. 認証後、アプリケーションにリダイレクトされることを確認

### 成功時の動作
- Apple IDログイン画面が表示される
- Face ID/Touch ID認証が要求される場合がある
- 認証後、アプリケーションにリダイレクト
- ダッシュボードが表示される

## 8. トラブルシューティング

### よくあるエラー

**Error: Invalid provider**
```
解決方法: SupabaseでAppleプロバイダーが有効になっているか確認
Authentication → Settings → Auth → Apple
```

**Error: invalid_client**
```
解決方法: Client SecretのJWTトークンを確認
- Key ID、Team ID、Client IDが正しいか確認
- 秘密鍵ファイルが正しいか確認
- JWTの有効期限が切れていないか確認
```

**Error: unauthorized_client**
```
解決方法: Apple Developer Portalの設定を確認
- Services IDのドメイン設定を確認
- Return URLsが正しいか確認
```

**Error: not_supported**
```
解決方法: HTTPSでアクセスしているか確認
- localhostでは動作しません
- 開発時はngrokなどを使用
```

### デバッグ方法

**ブラウザコンソールで確認**
```javascript
// Apple認証の実行
import { auth } from './lib/supabase';
auth.signInWithApple().then(result => {
  console.log('Apple auth result:', result);
}).catch(error => {
  console.error('Apple auth error:', error);
});
```

## 9. セキュリティ設定

### 推奨設定
- JWTトークンの定期的な更新（6ヶ月に1回）
- 秘密鍵の安全な管理
- 不要なスコープの削除
- ドメインの適切な設定

### プライバシー設定
Apple ID認証では以下の情報が取得可能：
- メールアドレス（private relayの場合あり）
- 氏名（初回のみ）
- 認証状態

## 10. 設定確認チェックリスト

### Apple Developer Portal
- [ ] Services IDを作成
- [ ] Sign in with Appleを有効化
- [ ] ドメインとReturn URLsを設定
- [ ] 秘密鍵を生成してダウンロード
- [ ] Key ID、Team IDを確認

### Supabase
- [ ] AppleプロバイダーをONにする
- [ ] Client IDを入力
- [ ] Client Secret（JWT）を生成して入力
- [ ] リダイレクトURLを確認

### 開発環境
- [ ] HTTPS環境を準備（ngrokなど）
- [ ] 環境変数を設定
- [ ] 開発サーバーを起動

### 動作確認
- [ ] Apple IDログインボタンをクリック
- [ ] Apple IDログイン画面が表示される
- [ ] 認証後、ダッシュボードが表示される
- [ ] ユーザー情報が正しく取得される

## 重要な注意事項

1. **HTTPS必須**: Apple ID認証はHTTPS環境でのみ動作
2. **開発環境の制限**: localhostでは動作しないため、開発時は代替手段が必要
3. **JWT更新**: Client SecretのJWTトークンは定期的に更新が必要
4. **プライバシー**: Apple IDは高いプライバシー保護を提供

これらの設定が完了すると、Apple ID認証が正常に動作するようになります。