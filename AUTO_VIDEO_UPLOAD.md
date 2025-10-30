# 自動動画アップロードシステム（現状と手順）

このリポジトリには「Supabase をバックエンドにした自動動画アップロード」の実装が一通り含まれています。大きく分けて以下の3系統があります。

- API 経由の単体アップロード（Vercel サーバーレス）
- ローカルフォルダ監視 → 自動処理・自動アップロード（ウォッチャー）
- ローカルの動画ディレクトリを一括取り込み（バッチ）

現状、機能は揃っていますが、一部ファイルで文字化けや構文エラーがあり、そのままではビルド/実行に失敗します。下記に「使い方」とあわせて「既知の課題」を記載します。

## 構成（主要ファイル）
- `api/upload-auto.ts` → `project-bolt-sb1-a6rmxyri/project/api/upload-auto.ts` を再エクスポート
- `project-bolt-sb1-a6rmxyri/project/api/upload-auto.ts`（API 本体）
  - マルチパート POST 受信、ffmpeg でメタデータ/サムネ生成、カテゴリ推定、Supabase Storage/DB 登録
- `project-bolt-sb1-a6rmxyri/project/src/lib/folderWatcher.ts`（フォルダ監視の核）
  - MP4 追加を契機に、バリデーション → 透かし → サムネ生成 → タグ生成 → Supabase 連携
- `project-bolt-sb1-a6rmxyri/project/scripts/watch-uploads.js`（CLI ウォッチャー）
  - `FolderWatcher` を使った対話的 CLI（進捗表示）
- `src/tools/auto-ingest.ts`（ローカル一括取り込み）
  - ディレクトリを走査し、ffmpeg でサムネ生成、（任意で Rekognition 利用）、Storage/DB へ登録
- `src/tools/supa-upload.ts`（簡易アップローダ）
  - 署名付きアップロード URL を使ったストレージ転送ツール

補足: 既存の `project-bolt-sb1-a6rmxyri/project/AUTO_UPLOAD_GUIDE.md` は文字化けが多く判読しづらいため、本ファイルに現状と手順を整理し直しています。

## 事前準備
- Node.js（v18+ 推奨）
- ffmpeg（ローカル実行時は PATH にあると安定。サーバーレス側は `ffmpeg-static` を使用）
- Supabase プロジェクト（Storage と DB テーブル `video_assets` が必要）
- `.env` 設定（下記）

### 主な環境変数
- Supabase 共通
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY` または `SUPABASE_SERVICE_ROLE_KEY`（サーバサイド/ツールで使用）
  - `SUPABASE_ANON_KEY`（クライアント用途。ツールは SERVICE キー優先）
- API（`api/upload-auto.ts`）
  - `UPLOAD_ALLOWED_ORIGIN`（CORS 許可。空ならリクエスト Origin か `*`）
  - `UPLOAD_API_KEY`（本番では必須。`X-API-Key` ヘッダで検証）
  - `UPLOAD_IP_ALLOWLIST`（任意。カンマ区切りの許可 IP）
  - `VERCEL_ENV` / `NODE_ENV`（本番以外は API キー検証を緩和）
- 透かし関連（任意）
  - `WATERMARK_IMAGE_PATH`（全画面イメージ透かしに使用する PNG 等のパス）
  - `WATERMARK_IMAGE_OPACITY`（0〜1、小数。例: 0.85）

`.env.example` が複数箇所にある場合は、ルートと `project-bolt-sb1-a6rmxyri/project/` それぞれを参考にしてください。

## 1) API 経由の単体アップロード
- エンドポイント: `POST /api/upload-auto`
- 認証: 本番では `X-API-Key: <UPLOAD_API_KEY>` を必須にする想定
- フォーム: `multipart/form-data`
  - フィールド: `video`（必須、mp4/mov/webm/avi）
  - 任意: `title`, `description`, `category`（beauty|fitness|haircare|business|lifestyle）
- 主要処理
  - ffmpeg でメタデータ抽出・サムネ生成
  - ファイル名・内容からカテゴリ推定（`src/utils/categoryInference.ts`）
  - Supabase Storage へ `video-assets` バケット配下に保存、公開 URL を取得
  - `video_assets` テーブルにメタ情報を INSERT

例（curl）:

```
curl -X POST "https://<your-domain>/api/upload-auto" \
  -H "X-API-Key: <UPLOAD_API_KEY>" \
  -F "video=@/path/to/movie.mp4" \
  -F "title=Sample" \
  -F "description=Auto upload" \
  -F "category=beauty"
```

ローカルでの動作確認は Vercel CLI（`vercel dev`）や Node ランタイムでの実行環境に合わせて行ってください。

## 2) ローカルフォルダ監視で自動アップロード（ウォッチャー）
- エントリ: `project-bolt-sb1-a6rmxyri/project/scripts/watch-uploads.js`
- 既定の監視フォルダ: `./uploads/watch`
- 処理フロー
  1) MP4 の新規追加を検知
  2) バリデーション（フォーマット・長さ10秒±1秒・解像度 >= 720p・サイズ <= 100MB など）
  3) 透かし付与（画像全画面 or テキストパターン）
  4) サムネ生成、タグ生成
  5) Supabase Storage/DB へ登録 → `processed`/`failed` へ移動
- 主なオプション（CLI 引数）
  - `--watermark=<preset>`（`diagonalPattern` など。`--no-watermark` で無効化）
  - `--wm-image=<path>`、`--wm-opacity=<0..1>`（画像透かし用）

実行例:

```
node project-bolt-sb1-a6rmxyri/project/scripts/watch-uploads.js \
  --watermark=diagonalPattern
```

※ 実行には `.env` の Supabase 設定が必要です。

## 3) ディレクトリの一括取り込み（バッチ）
- ツールA: `src/tools/auto-ingest.ts`
  - ffmpeg でサムネ生成、（任意で）AWS Rekognition によるタグ補助
  - Storage/DB 登録（バケット名は引数で指定）
  - 実行例:
    ```
    npx tsx src/tools/auto-ingest.ts \
      --dir ./videos \
      --bucket video-assets \
      --provider none \
      --dry    # 確認のみ（外すと実際にアップロード）
    ```
- ツールB: `src/tools/supa-upload.ts`
  - 署名付き URL 経由でストレージに転送（正規表現 or ディレクトリでカテゴリ切り）
  - 実行例:
    ```
    npx tsx src/tools/supa-upload.ts \
      --dir ./videos \
      --bucket video-assets \
      --scheme regex \
      --regex "^(?<category>[^_-]+)[_-]" \
      --concurrency 4 --upsert
    ```

## 推奨運用フロー（例）
1) まずローカルで `auto-ingest.ts` を `--dry` で走らせ、計画/タグを確認
2) 問題なければ `--dry` を外して一括アップロード
3) 以降は `watch-uploads.js` を常駐させ、日々の追加を自動処理
4) Web/API 経由で単発アップロードが必要な場合は `/api/upload-auto` を利用

## 既知の課題（要修正）
- 文字化け/構文エラーによりビルド不能な箇所があります。
  - `project-bolt-sb1-a6rmxyri/project/api/upload-auto.ts:246` のタグ生成行が壊れている（バッククォートの閉じ忘れ、単位文字の文字化け）。
  - `project-bolt-sb1-a6rmxyri/project/src/lib/videoProcessor.ts:406` 同様にタグ生成行が壊れている。
  - `src/tools/supa-watch.ts` に別言語のコード片が紛れ込んでおり、現状では動作しません。
- バケット名の不一致
  - API では `video-assets` バケットを前提としていますが、ツール側は引数で自由に指定できます。実運用ではバケット名を統一してください。
- 透かし文字列/UI 表示に使う日本語定数の一部が文字化けしています（ログ/ラベルのみの問題で動作には直接影響しない箇所もあります）。

## 次のアクション（提案）
- 上記 3点のコード修正（構文/エンコーディング）
- バケット名・テーブルスキーマの最終統一
- 最小限の E2E テスト（API に対する mp4 POST → Storage/DB 反映を確認）
- 本番運用時の制限事項（API キー/IP 制限/レート制御）の再確認

以上。コード自体は揃っているため、上記の軽微修正を行えば本番運用レベルに到達できます。必要であれば、修正対応や統合テストの追加も実施します。
