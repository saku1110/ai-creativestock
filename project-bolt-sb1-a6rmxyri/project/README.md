# ai-creativestock

## Supabase Storage へのローカル動画アップロード

ローカル開発用に置いている `src/local-content` 配下の動画ファイルは Git 管理に含めず、Supabase Storage にアップロードして利用できます。

1. Supabase プロジェクトで `local-content`（任意）というバケットを作成し、公開アクセスを許可します。
2. `.env` などに以下を設定します。
   ```bash
   SUPABASE_URL=...               # プロジェクトURL
   SUPABASE_SERVICE_ROLE_KEY=...  # Service Role Key（サーバー用）
   SUPABASE_STORAGE_BUCKET=local-content        # 任意。省略時は local-content
   SUPABASE_STORAGE_PREFIX=local-content         # 任意のプレフィックス
   ```
3. `npm run upload:local-content` を実行すると、`src/local-content` 以下の mp4 / webm / mov が Supabase Storage にアップされ、公開URLをまとめた `src/local-content/remote-manifest.ts` が自動生成されます。
4. フロントエンドは生成されたマニフェストを参照し、存在する場合は Supabase のURLを優先して再生します。

> **Note**: このスクリプトは `SUPABASE_SERVICE_ROLE_KEY` を使用するため、ローカル環境など信頼できる環境のみで実行してください。
