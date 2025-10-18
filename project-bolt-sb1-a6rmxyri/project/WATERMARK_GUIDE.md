# 動画ウォーターマークガイド

## 概要
AI Creative Stockプラットフォームでは、アップロードされる全ての動画に自動的にウォーターマークを追加できます。これにより、コンテンツの不正使用を防ぎ、ブランドの認知度を高めることができます。

## ウォーターマークパターン

### 1. 斜めパターン（diagonalPattern）- デフォルト・推奨
- **説明**: 動画全体に斜めのパターンでウォーターマークを配置
- **透明度**: 25%
- **フォントサイズ**: 36px
- **間隔**: 180px
- **用途**: 標準的な保護レベル、視聴体験への影響最小

### 2. 軽いパターン（lightPattern）
- **説明**: 目立ちにくい軽いウォーターマーク
- **透明度**: 15%
- **フォントサイズ**: 28px
- **間隔**: 220px
- **用途**: プレビュー動画、視聴体験を重視する場合

### 3. 密集パターン（densePattern）
- **説明**: より強い保護のための密集配置
- **透明度**: 35%
- **フォントサイズ**: 32px
- **間隔**: 120px
- **用途**: 高価値コンテンツ、より強い保護が必要な場合

### 4. 超密集パターン（ultraDensePattern）
- **説明**: 最強レベルの保護
- **透明度**: 40%
- **フォントサイズ**: 40px
- **間隔**: 100px
- **用途**: 最重要コンテンツ、無断使用の完全防止

### 5. 単一（single）- 非推奨
- **説明**: 右下に単一のウォーターマーク
- **透明度**: 70%
- **フォントサイズ**: 24px
- **用途**: 最小限の保護、編集で簡単に除去可能

## 使用方法

### 1. コマンドラインでの自動アップロード

```bash
# デフォルト（斜めパターン）でウォーターマーク追加
npm run watch:uploads

# 特定のパターンを指定
npm run watch:uploads -- --watermark=lightPattern
npm run watch:uploads -- --watermark=densePattern
npm run watch:uploads -- --watermark=ultraDensePattern

# ウォーターマークを無効化
npm run watch:uploads -- --no-watermark
```

画像ウォーターマーク（フルフレーム・推奨）を自動適用するには、9:16透過PNGを指定します:

```bash
# 例: 画像ウォーターマークを有効化
cd project-bolt-sb1-a6rmxyri/project
WATERMARK_IMAGE_PATH=./brand/watermark-9x16.png npm run watch:uploads

# あるいはCLI引数で
npm run watch:uploads -- --wm-image=./brand/watermark-9x16.png --wm-opacity=0.85
```

置き場所の推奨:
- `project-bolt-sb1-a6rmxyri/project/brand/watermark-9x16.png`
- 9:16比率・透過背景・位置調整済み（全面重ね）

備考:
- 指定がある場合は画像ウォーターマークが優先され、テキストパターンは無効になります。
- 動画と生成されるサムネイル双方に同じロゴを全面合成します（解像度に合わせて自動リサイズ）。

### 1.5 画像ウォーターマーク（ロゴ）を動画とサムネに適用

所持しているPNGロゴ等を焼き込みたい場合は以下を使用します。

```bash
# 単一ファイル: 動画にロゴ焼き込み + スタートフレーム(サムネ)にもロゴ合成
cd project-bolt-sb1-a6rmxyri/project
npm run watermark:apply -- \
  --input ./uploads/sample.mp4 \
  --output ./watermarked \
  --wm ./brand/watermark.png \
  --pos bottom-right \
  --opacity 0.85 \
  --wm-scale 0.18 \
  --thumb --thumb-time 0.0

# ディレクトリ一括（同オプション適用）
npm run watermark:apply -- \
  --input ./uploads \
  --output ./watermarked \
  --wm ./brand/watermark.png \
  --pos bottom-right \
  --opacity 0.85 \
  --wm-scale 0.18 \
  --thumb --thumb-time 0.0
```

- `--wm`: ウォーターマーク画像(PNG推奨)
- `--pos`: top-left | top-right | bottom-left | bottom-right | center
- `--opacity`: 透過(0-1)
- `--wm-scale`: ロゴ幅の割合(動画/サムネの幅に対する比率)。例: 0.18 = 幅の18%
- `--thumb`: サムネイルも生成してロゴ合成
- `--thumb-time`: 何秒地点のフレームをサムネにするか

出力例:
- `*_wm.mp4` … ロゴ焼き込み済み動画
- `*_thumb_wm.jpg` … ロゴ合成済みスタートフレーム画像

### 2. Web UIでのアップロード

管理者画面（`/admin/upload`または`/auto-upload`）から：

1. 動画ファイルを選択またはドラッグ&ドロップ
2. 「ウォーターマーク処理」セクションで有効/無効を切り替え
3. ドロップダウンからパターンを選択
4. アップロードボタンをクリック

### 3. プログラムからの使用

```typescript
import { VideoProcessor } from './lib/videoProcessor';

// 単一ファイルにウォーターマーク追加
const result = await VideoProcessor.addWatermark(
  'input.mp4',
  'output.mp4',
  'diagonalPattern' // パターンを指定
);

// バッチ処理
const videos = [
  { inputPath: 'video1.mp4', outputPath: 'watermarked1.mp4' },
  { inputPath: 'video2.mp4', outputPath: 'watermarked2.mp4' }
];

const results = await VideoProcessor.batchAddWatermark(
  videos,
  'densePattern',
  (current, total, filename) => {
    console.log(`Processing ${current}/${total}: ${filename}`);
  }
);
```

## 設定のカスタマイズ

`src/lib/videoWatermark.ts`の`WatermarkPresets`オブジェクトを編集して、独自のプリセットを作成できます：

```typescript
export const WatermarkPresets = {
  customPattern: {
    text: 'Your Brand Name',
    position: 'diagonal-pattern',
    opacity: 0.3,
    fontSize: 40,
    color: 'white',
    spacing: 150,
    angle: -30
  }
};
```

## 技術要件

- **ffmpeg**: システムにffmpegがインストールされている必要があります
- **Node.js**: v14以上
- **対応フォーマット**: MP4, MOV, AVI, WebM

## トラブルシューティング

### ウォーターマークが追加されない
1. ffmpegがインストールされているか確認: `ffmpeg -version`
2. 動画ファイルが破損していないか確認
3. ログでエラーメッセージを確認

### パフォーマンスの問題
- 大きな動画ファイルの処理には時間がかかります
- `lightPattern`を使用して処理速度を向上
- 複数の動画を同時に処理する場合はバッチ処理を使用

### ウォーターマークが見えにくい
- より濃いパターン（`densePattern`または`ultraDensePattern`）を使用
- 透明度を上げる（カスタムプリセットで調整）

## ベストプラクティス

1. **標準コンテンツ**: `diagonalPattern`（デフォルト）を使用
2. **プレビュー動画**: `lightPattern`で視聴体験を保持
3. **プレミアムコンテンツ**: `densePattern`または`ultraDensePattern`で強力な保護
4. **テスト**: 本番環境に適用する前に、少数のサンプルでテスト
5. **バックアップ**: オリジナルファイルは常に保持（`deleteAfterUpload: false`）

## セキュリティ上の考慮事項

- ウォーターマークは完全な保護を保証するものではありません
- 高度な編集技術により除去される可能性があります
- 法的保護と組み合わせて使用することを推奨
- 定期的にパターンを変更して予測を困難に

## サポート

問題が発生した場合は、以下を確認してください：
- ログファイル: `logs/upload-*.log`
- エラーメッセージ: コンソール出力
- 設定ファイル: `.env`および`watcherConfig`

詳細なサポートが必要な場合は、管理者にお問い合わせください。
