# AI Creative Stock 開発コマンド一覧

## 基本的な開発コマンド

### 開発サーバー起動
```bash
npm run dev
```

### ビルド
```bash
npm run build
```

### プレビュー（ビルド後の確認）
```bash
npm run preview
```

## コード品質管理

### リンター実行
```bash
npm run lint
```

## テスト

### テスト実行
```bash
npm run test
```

### テストUI起動
```bash
npm run test:ui
```

### 単発テスト実行
```bash
npm run test:run
```

### カバレッジ付きテスト
```bash
npm run test:coverage
```

## システムコマンド（Linux）

### ディレクトリ移動
```bash
cd /mnt/c/Users/kise7/OneDrive/デスクトップ/AI Creative Stock
```

### プロジェクトディレクトリへ移動
```bash
cd project-bolt-sb1-a6rmxyri/project
```

### ファイル一覧表示
```bash
ls -la
```

### Git操作（未初期化のため今後必要）
```bash
git init
git add .
git commit -m "Initial commit"
```

## 依存関係管理

### パッケージインストール
```bash
npm install
```

### パッケージ追加
```bash
npm install <package-name>
```

### 開発用パッケージ追加
```bash
npm install -D <package-name>
```

## タスク完了時に実行すべきコマンド

1. コードのリント実行
   ```bash
   npm run lint
   ```

2. テストの実行
   ```bash
   npm run test:run
   ```

3. ビルドの確認
   ```bash
   npm run build
   ```