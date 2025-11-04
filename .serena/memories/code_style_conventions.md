# AI Creative Stock コーディング規約とスタイル

## TypeScript/JavaScript
- **TypeScript**を使用（厳密な型定義）
- ファイル拡張子: `.ts`, `.tsx`（Reactコンポーネント）
- インポート文は絶対パスまたは相対パスを使用
- ES6+の構文を活用（アロー関数、分割代入、テンプレートリテラル等）

## React規約
- 関数コンポーネントを使用（クラスコンポーネントは避ける）
- Hooksを活用（useState, useEffect, カスタムフック等）
- コンポーネント名はPascalCase
- propsの型定義にはTypeScriptのinterfaceを使用

## ファイル・ディレクトリ構造
```
src/
├── components/     # UIコンポーネント
├── hooks/         # カスタムフック
├── lib/           # ライブラリ設定（Supabase等）
├── types/         # TypeScript型定義
├── utils/         # ユーティリティ関数
├── auth/          # 認証関連
├── scripts/       # スクリプト
└── test/          # テストファイル
```

## 命名規則
- 変数・関数: camelCase
- 定数: UPPER_SNAKE_CASE
- インターフェース・型: PascalCase
- ファイル名: 
  - コンポーネント: PascalCase（例: `VideoCard.tsx`）
  - その他: kebab-case（例: `auth-utils.ts`）

## スタイリング
- **Tailwind CSS**のユーティリティクラスを使用
- カスタムCSSは最小限に抑える
- レスポンシブデザインを考慮

## コード品質
- ESLint設定に従う
- 不要なコメントは避ける
- 関数は単一責任原則に従う
- エラーハンドリングを適切に実装

## セキュリティ
- 機密情報は環境変数に格納
- ユーザー入力はサニタイズ（DOMPurify使用）
- HTTPS通信の徹底
- 認証・認可の適切な実装

## Git規約（今後の実装時）
- コミットメッセージは明確に
- 機能ごとにブランチを作成
- プルリクエストでコードレビュー