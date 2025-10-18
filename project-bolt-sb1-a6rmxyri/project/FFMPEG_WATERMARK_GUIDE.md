# FFmpeg動画ウォーターマーク処理ガイド

FFmpegを使用した動画ウォーターマーク処理システムの詳細ガイドです。

## 概要

このシステムは、アップロードされた動画に自動的にウォーターマークを追加する機能を提供します。

### 主な機能
- **テキストウォーターマーク**: カスタムテキストをオーバーレイ
- **画像ウォーターマーク**: ロゴや画像をオーバーレイ
- **バッチ処理**: 複数の動画を一括処理
- **自動処理**: アップロード時の自動ウォーターマーク適用

## システム要件

### 必須ソフトウェア
- **FFmpeg**: 動画処理ライブラリ
- **Node.js**: 14.0以上
- **npm**: パッケージマネージャー

### FFmpegのインストール

#### Windows
```bash
# Chocolateyを使用
choco install ffmpeg

# または手動インストール
# 1. https://ffmpeg.org/download.html からダウンロード
# 2. 解凍してPATHに追加
```

#### macOS
```bash
# Homebrewを使用
brew install ffmpeg
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install ffmpeg
```

### インストール確認
```bash
ffmpeg -version
```

## 使用方法

### 1. バッチ処理スクリプト

#### 基本的な使用方法
```bash
# シンプルな実行
node scripts/watermark-batch.js ./uploads ./watermarked

# カスタム設定
node scripts/watermark-batch.js ./uploads ./watermarked \
  --text "My Company" \
  --position center \
  --opacity 0.5 \
  --font-size 32 \
  --color red
```

#### 利用可能なオプション
- `--text <text>`: ウォーターマークテキスト
- `--position <position>`: 位置 (top-left, top-right, bottom-left, bottom-right, center)
- `--opacity <opacity>`: 透明度 (0.0-1.0)
- `--font-size <size>`: フォントサイズ
- `--color <color>`: 文字色
- `--font-file <path>`: カスタムフォントファイル

### 2. プログラム内での使用

#### テキストウォーターマーク
```typescript
import { VideoWatermarkProcessor } from './lib/videoWatermark';

const result = await VideoWatermarkProcessor.addTextWatermark(
  'input.mp4',
  'output.mp4',
  {
    text: 'AI Creative Stock',
    position: 'bottom-right',
    opacity: 0.7,
    fontSize: 24,
    color: 'white'
  }
);
```

#### 画像ウォーターマーク
```typescript
const result = await VideoWatermarkProcessor.addImageWatermark(
  'input.mp4',
  'watermark.png',
  'output.mp4',
  'bottom-right',
  0.7
);
```

#### バッチ処理
```typescript
const result = await VideoWatermarkProcessor.batchProcess(
  './uploads',
  './watermarked',
  { text: 'Company Logo', position: 'center' },
  (current, total, filename) => {
    console.log(`処理中: ${current}/${total} - ${filename}`);
  }
);
```

### 3. 管理画面での設定

#### アップロード時の自動適用
1. 管理者でログイン
2. 動画アップロードページにアクセス
3. 「ウォーターマーク処理」を有効化
4. 動画をアップロード

#### 設定項目
- **有効/無効**: ウォーターマーク処理の切り替え
- **テキスト**: 表示するテキスト
- **位置**: 表示位置の選択
- **透明度**: 0-100%の調整
- **フォントサイズ**: 12-48pxの範囲
- **色**: プリセット色またはカスタム色

## 技術仕様

### 対応フォーマット
- **入力形式**: MP4, AVI, MOV, MKV, WMV, FLV, WebM
- **出力形式**: 元のフォーマットを維持
- **画像形式**: PNG, JPG, WebP (画像ウォーターマーク用)

### ウォーターマーク設定

#### 位置座標
- **top-left**: `x=10, y=10`
- **top-right**: `x=w-tw-10, y=10`
- **bottom-left**: `x=10, y=h-th-10`
- **bottom-right**: `x=w-tw-10, y=h-th-10`
- **center**: `x=(w-tw)/2, y=(h-th)/2`

#### FFmpegフィルター例
```bash
# テキストウォーターマーク
ffmpeg -i input.mp4 -vf "drawtext=text='AI Creative Stock':fontsize=24:fontcolor=white@0.7:x=w-tw-10:y=h-th-10" output.mp4

# 画像ウォーターマーク
ffmpeg -i input.mp4 -i watermark.png -filter_complex "overlay=main_w-overlay_w-10:main_h-overlay_h-10:format=auto:alpha=0.7" output.mp4
```

## 実装詳細

### ファイル構成
```
src/
├── lib/
│   └── videoWatermark.ts      # メインクラス
├── components/
│   ├── AdminUpload.tsx        # アップロード画面
│   └── WatermarkSettings.tsx  # 設定コンポーネント
└── scripts/
    └── watermark-batch.js     # バッチ処理スクリプト
```

### 主要クラス

#### VideoWatermarkProcessor
```typescript
class VideoWatermarkProcessor {
  // テキストウォーターマーク追加
  static async addTextWatermark(
    inputPath: string,
    outputPath: string,
    config: WatermarkConfig
  ): Promise<ProcessingResult>
  
  // 画像ウォーターマーク追加
  static async addImageWatermark(
    inputPath: string,
    watermarkImagePath: string,
    outputPath: string,
    position: string,
    opacity: number
  ): Promise<ProcessingResult>
  
  // バッチ処理
  static async batchProcess(
    inputDirectory: string,
    outputDirectory: string,
    config: WatermarkConfig,
    onProgress?: Function
  ): Promise<BatchResult>
}
```

### エラーハンドリング

#### 一般的なエラー
- **FFmpeg not found**: FFmpegがインストールされていない
- **Invalid input file**: 入力ファイルが存在しない/破損している
- **Codec error**: サポートされていないフォーマット
- **Permission denied**: ファイルアクセス権限がない

#### エラー対応
```typescript
try {
  const result = await VideoWatermarkProcessor.addTextWatermark(
    inputPath,
    outputPath,
    config
  );
  
  if (!result.success) {
    console.error('ウォーターマーク処理エラー:', result.error);
  }
} catch (error) {
  console.error('予期しないエラー:', error);
}
```

## パフォーマンス最適化

### 処理速度の向上
- **ハードウェアアクセラレーション**: GPU利用
- **並列処理**: 複数ファイルの同時処理
- **品質設定**: 適切な品質バランス

### 設定例
```typescript
// 高速処理設定
const config = {
  text: 'Watermark',
  position: 'bottom-right',
  opacity: 0.7,
  fontSize: 20,
  color: 'white'
};

// 高品質設定
const config = {
  text: 'Premium Content',
  position: 'center',
  opacity: 0.5,
  fontSize: 32,
  color: 'rgba(255,255,255,0.8)',
  fontFile: '/path/to/custom-font.ttf'
};
```

## トラブルシューティング

### よくある問題

#### 1. FFmpegが見つからない
```bash
# エラー: FFmpeg spawn error
# 解決: PATH環境変数を確認
echo $PATH
which ffmpeg
```

#### 2. 処理が遅い
```bash
# ハードウェアアクセラレーション有効化
ffmpeg -hwaccels  # 利用可能なアクセラレーターを確認
```

#### 3. 文字化け
```bash
# フォントファイルを指定
--font-file "/path/to/japanese-font.ttf"
```

#### 4. メモリ不足
```bash
# 大きなファイルの処理時
# Node.jsメモリ制限を増加
node --max-old-space-size=4096 scripts/watermark-batch.js
```

### デバッグ方法

#### 詳細ログ有効化
```typescript
// 動画情報を取得
const info = await VideoWatermarkProcessor.getVideoInfo('input.mp4');
console.log('動画情報:', info);

// FFmpeg可用性チェック
const available = await VideoWatermarkProcessor.checkFFmpegAvailability();
console.log('FFmpeg利用可能:', available);
```

## セキュリティ考慮事項

### 入力検証
- ファイルサイズ制限
- 許可されたファイルフォーマット
- パス traversal 攻撃防止

### 一時ファイル管理
- 処理後の自動削除
- セキュアな一時ディレクトリ
- ファイル権限の適切な設定

## 今後の拡張

### 予定機能
- **動的ウォーターマーク**: 時間によって変化
- **複数ウォーターマーク**: 複数の要素を同時適用
- **テンプレート機能**: 定型ウォーターマーク設定
- **プレビュー機能**: 処理前のプレビュー表示

### API拡張
- **REST API**: HTTP経由でのウォーターマーク処理
- **Webhook**: 処理完了通知
- **進捗追跡**: リアルタイム処理状況

---

このガイドを参考に、効率的な動画ウォーターマーク処理システムを活用してください。