# AI Creative Stock コードベース構造

## プロジェクトルート構造
```
/mnt/c/Users/kise7/OneDrive/デスクトップ/AI Creative Stock/
├── project-bolt-sb1-a6rmxyri/     # bolt.newで生成されたプロジェクト
│   └── project/                    # メインプロジェクトディレクトリ
├── 要件定義書.md                    # プロジェクト要件定義
├── CLAUDE.md                       # Claude Codeセッション管理
├── session-manager.js              # 会話履歴管理システム
├── claude-hook.js                  # 自動保存フック
└── .claude-history.json            # 会話履歴データ
```

## メインプロジェクト構造（project-bolt-sb1-a6rmxyri/project/）
```
├── src/                    # ソースコード
│   ├── App.tsx            # メインアプリケーションコンポーネント
│   ├── main.tsx           # エントリーポイント
│   ├── index.css          # グローバルスタイル
│   ├── components/        # UIコンポーネント
│   ├── hooks/             # カスタムフック
│   ├── lib/               # 外部ライブラリ設定
│   ├── types/             # TypeScript型定義
│   ├── utils/             # ユーティリティ関数
│   ├── auth/              # 認証関連
│   ├── scripts/           # ヘルパースクリプト
│   └── test/              # テストファイル
├── public/                 # 静的ファイル
├── database/              # データベース関連
├── supabase/              # Supabase設定
├── scripts/               # ビルド・デプロイスクリプト
├── k8s/                   # Kubernetes設定
├── package.json           # プロジェクト設定・依存関係
├── vite.config.ts         # Vite設定
├── tailwind.config.js     # Tailwind CSS設定
├── tsconfig.json          # TypeScript設定
├── vercel.json            # Vercelデプロイ設定
└── .env.example           # 環境変数テンプレート
```

## 重要な設定ファイル
- `package.json`: プロジェクトの依存関係とスクリプト
- `vite.config.ts`: ビルド・開発サーバー設定
- `tsconfig.json`: TypeScriptコンパイラ設定
- `tailwind.config.js`: スタイリング設定
- `vercel.json`: ホスティング設定
- `.env.example`: 環境変数のテンプレート

## ドキュメント
- 各種セットアップガイド（認証、決済、メール等）
- デプロイメントガイド
- セキュリティレポート
- パフォーマンスガイド