# AI Creative Stock 動画自動アップロードシステム

## 概要
このシステムは、動画ファイルを自動的に処理し、AIによるカテゴリ分類とメタデータ抽出を行いながら、Supabaseにアップロードします。

## 主な機能

### 1. 動画メタデータ自動抽出
- **解像度**: 動画の幅と高さを自動取得
- **動画の長さ**: 秒単位で自動計測
- **フレームレート**: FPSを自動検出
- **ビットレート**: 動画品質の指標を取得
- **コーデック**: 使用されているビデオコーデックを検出

### 2. AI自動カテゴリ分類
- **カテゴリ**: beauty（美容）、fitness（フィットネス）、haircare（ヘアケア）、business（ビジネス）、lifestyle（ライフスタイル）
- **信頼度スコア**: 分類の確実性を0-100%で表示
- **キーワード抽出**: 動画の内容から関連キーワードを自動生成
- **複数フレーム分析**: 動画の複数箇所から画像を抽出して分析

### 3. バッチアップロード機能
- **ドラッグ&ドロップ**: 複数ファイルを一度にドロップ
- **並列処理**: 複数ファイルを効率的に処理
- **プログレス表示**: 各ファイルの処理状況をリアルタイム表示
- **エラーハンドリング**: 失敗したファイルの再試行機能

### 4. フォルダ監視機能
- **自動検知**: 指定フォルダに新しいMP4ファイルが追加されると自動処理
- **バックグラウンド処理**: システムが自動的にファイルを処理
- **処理済み管理**: 処理済みファイルは別フォルダに移動

## 使用方法

### Webインターフェース経由（推奨）

1. **管理者としてログイン**
   ```
   https://your-domain.com
   ```

2. **自動アップロードページにアクセス**
   - ダッシュボードから「自動アップロード」を選択
   - または直接 `/auto-upload` にアクセス

3. **動画ファイルをアップロード**
   - ドラッグ&ドロップで複数ファイルを追加
   - または「ファイルを選択」ボタンから選択

4. **処理状況を確認**
   - 各ファイルの処理状況がリアルタイムで表示
   - AIによるカテゴリ分類結果を確認
   - 必要に応じて手動で修正可能

### フォルダ監視経由（自動化）

### バッチ一括アップロード（数百本対応・カテゴリ分け）

1. サーバ/APIの起動（開発）
   ```bash
   vercel dev
   # http://localhost:3000 に API /api/upload/auto が立ち上がります
   ```

2. ディレクトリ構成を用意（例: ディレクトリ名=カテゴリ）
   ```
   /path/to/videos
   ├─ beauty/
   │   ├─ beauty_001.mp4
   │   └─ beauty_002.mp4
   ├─ business/
   │   └─ biz-landing-01.mp4
   └─ lifestyle/
       └─ life_0001.mp4
   ```

3. 実行（ディレクトリ名をカテゴリとして適用）
   ```bash
   # プロジェクト直下
   npm run upload:bulk -- \
     --dir /path/to/videos \
     --scheme dir \
     --concurrency 4 \
     --base-url http://localhost:3000
   ```

4. ファイル名からカテゴリ抽出（例: Beauty_*.mp4 → Beauty）
   ```bash
   npm run upload:bulk -- \
     --dir /path/to/videos \
     --scheme regex \
     --regex "^(?<category>[^_\-]+)[_\-]" \
     --concurrency 4 \
     --base-url http://localhost:3000
   ```

備考
- このスクリプトは `/api/upload/auto` に対して1本ずつPOSTします。
- サーバ側でメタデータ抽出・サムネ生成・Storage保存・`video_assets` への挿入まで行うため、ダッシュボードに即時反映されます。
- 本番で使う場合は `VITE_UPLOAD_API_KEY` / `UPLOAD_API_KEY` を同じ値で設定してください。

1. **環境設定**
   ```bash
   # .envファイルを作成
   cp .env.example .env
   # Supabaseの認証情報を設定
   ```

2. **フォルダ監視を開始**
   ```bash
   npm run watch:uploads
   ```

3. **動画ファイルを追加**
   ```bash
   # MP4ファイルをwatchフォルダにコピー
   cp your-video.mp4 ./uploads/watch/
   ```

4. **自動処理**
   - システムが自動的にファイルを検出
   - メタデータ抽出とAI分類を実行
   - Supabaseにアップロード
   - 処理済みファイルは `./uploads/processed/` に移動

## フォルダ構造

```
uploads/
├── watch/        # 監視対象フォルダ（新しいファイルをここに配置）
├── processed/    # 処理済みファイル
└── failed/       # 処理失敗ファイル

temp/
├── frames/       # 一時的なフレーム画像
└── thumbnails/   # 生成されたサムネイル
```

## API エンドポイント

### POST /api/upload/auto
動画の自動アップロードと処理を行います。

**リクエスト:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body:
  - `video`: 動画ファイル（必須）
  - `title`: タイトル（オプション）
  - `description`: 説明（オプション）
  - `category`: カテゴリの手動指定（オプション）

**レスポンス:**
```json
{
  "success": true,
  "data": {
    "id": "video-id",
    "title": "動画タイトル",
    "category": "beauty",
    "metadata": {
      "duration": 10,
      "resolution": "1920x1080",
      "frameRate": 30,
      "bitrate": 5000000,
      "codec": "h264",
      "size": 10485760,
      "format": "mp4"
    },
    "classification": {
      "category": "beauty",
      "confidence": 0.85,
      "keywords": ["makeup", "cosmetics", "beauty"]
    },
    "tags": ["beauty", "Full HD", "9:16", "10秒"],
    "urls": {
      "video": "https://...",
      "thumbnail": "https://..."
    }
  }
}
```

## 技術仕様

### 対応フォーマット
- **動画形式**: MP4, MOV, AVI, WebM
- **推奨コーデック**: H.264
- **最大ファイルサイズ**: 100MB
- **推奨動画長**: 10秒
- **最小解像度**: 720p

### カテゴリ分類ロジック
1. 動画から3フレームを抽出（開始、中間、終了付近）
2. 各フレームをTensorFlow.js MobileNetで分析
3. 検出されたオブジェクトとキーワードマッピングを照合
4. 最も高いスコアのカテゴリを選択
5. 信頼度が低い場合は「lifestyle」をデフォルトとする

### パフォーマンス最適化
- **並列処理**: 最大3ファイルまで同時処理
- **メモリ管理**: 大きなファイルはストリーミング処理
- **キャッシュ**: TensorFlowモデルは初回ロード後メモリに保持
- **クリーンアップ**: 一時ファイルは処理後自動削除

## トラブルシューティング

### よくある問題と解決方法

**Q: アップロードが失敗する**
- ファイルサイズが100MBを超えていないか確認
- 動画形式がMP4であることを確認
- ネットワーク接続を確認

**Q: カテゴリ分類が正確でない**
- 動画の最初の数秒に主要なコンテンツがあることを確認
- 明るく鮮明な動画の方が分類精度が向上
- 手動でカテゴリを修正可能

**Q: フォルダ監視が動作しない**
- Node.jsのバージョンが18以上であることを確認
- ffmpeg-staticが正しくインストールされているか確認
- 環境変数が正しく設定されているか確認

## セキュリティ考慮事項

- ファイルアップロードは認証済みの管理者のみ実行可能
- アップロードされたファイルはウイルススキャンを推奨
- Supabaseのストレージポリシーで適切なアクセス制御を設定
- 本番環境ではHTTPS通信を必須とする

## 運用方針（小規模→コスト閾値でR2移行）

### 方針概要
- 構築優先のため、当面は Supabase Storage を利用
- 以下のいずれかを超えたら Cloudflare R2 + CDN へ移行検討
  - 月間エグレス（Storage Egress）: 200 GB 以上
  - 保存容量（Storage Size）: 500 GB 以上

### 監視手順（毎週確認）
- Supabase ダッシュボード → Usage → Storage で下記を確認
  - Storage Size（合計保存容量）
  - Storage Egress（当月エグレス）
- 参考クエリ（ダウンロード回数の目安）
  - 月内のダウンロード回数: `SELECT COUNT(*) FROM download_history WHERE downloaded_at >= date_trunc('month', now());`
  - ユーザー別トップ: `SELECT user_id, COUNT(*) AS cnt FROM download_history WHERE downloaded_at >= date_trunc('month', now()) GROUP BY 1 ORDER BY cnt DESC LIMIT 20;`

※ 厳密なエグレスはダッシュボード値を採用。内訳の把握にはダウンロード履歴 × ファイルサイズ（将来的に video_assets に file_size を追加して推定）を使用。

### 閾値アラート（運用ルール例）
- 80% 到達時（例: 月 160 GB / 総容量 400 GB）に警告・対策検討
- 100% 到達時に移行作業を実行

### R2 への移行チェックリスト（概要）
1. R2 準備
   - バケット作成、CORS 設定（PUT/GET/HEAD、Content-Type）
   - アクセスキー作成（Access Key / Secret）
   - CDN（Cloudflare）をバケットに紐づけ（Range 対応／長期キャッシュ）
2. 署名URL API 追加（新規）
   - `@aws-sdk/client-s3` + `getSignedUrl` で PUT 署名を発行
   - 認証は Supabase Auth（Service Role でユーザー確認）
3. クライアント切替（段階的）
   - 新規アップロードのみ「署名取得 → R2 へ直接 PUT」へ切替
   - DB（video_assets）には R2/CDN の URL を保存
4. バックフィル
   - 既存オブジェクトを R2 にコピー（並列ツールや一時バッチで移送）
5. 読み取り切替
   - 参照 URL を R2/CDN に統一し、Supabase 側は参照停止（必要なら保持）

この流れなら段階導入でき、ダウンタイム/実装工数を最小化できます。

## 今後の拡張予定

- [ ] OpenAI Vision APIを使用したより高度な分類
- [ ] 動画の自動タグ付け機能の強化
- [ ] 動画の品質自動評価
- [ ] 重複動画の自動検出
- [ ] バッチ処理のスケジューリング機能
- [ ] WebSocket経由のリアルタイム進捗通知

## サポート

問題が発生した場合は、以下を確認してください：
1. コンソールログでエラーメッセージを確認
2. `uploads/failed/` フォルダに失敗したファイルがあるか確認
3. Supabaseのダッシュボードでストレージ容量を確認
4. ネットワークタブで API リクエストの詳細を確認
