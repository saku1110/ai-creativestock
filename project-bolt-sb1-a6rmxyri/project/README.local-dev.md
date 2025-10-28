Local Dev: Admin Upload (Supabase)

Prerequisites
- Supabase project (Auth + Storage enabled)
- Storage bucket: `video-assets` (or adjust in `src/lib/supabase.ts`)

Environment
1) Copy `.env.example` to `.env.local` and fill:

VITE_APP_ENV=development
VITE_USE_SAMPLE_DATA=false
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY

2) Ensure the bucket policy allows authenticated uploads to `video-assets`.

Install & Run
- cd project-bolt-sb1-a6rmxyri/project
- npm install
- npm run dev
- Open http://localhost:5173/?variant=admin

Dashboard Auto-Refresh
- Realtime enabled: The dashboard updates instantly after upload via Supabase Realtime (DB → INSERT on `video_assets`).
- If it doesn’t update: Enable Realtime for `public.video_assets` in Supabase (Database → Replication → Configure → Add table).

Login (local)
- Use Supabase Auth (Email/Password or OAuth) via the app’s Login button.
- In local dev, admin check is bypassed, but a signed-in user is still required.

Category Save Path
- Video: `videos/<category>/<randomName>.mp4`
- Thumbnail: `thumbnails/<category>/<randomName>.<ext>`

Auto Category Hints
- If filename starts with a known category id (e.g. `beauty_foo.mp4`), it auto-selects.
- Otherwise, pick from the dropdown in the form.

Troubleshooting
- 401 on upload: Check you are logged in and bucket policy allows writes.
- Env missing: Ensure `.env.local` exists and Vite restarted after changes.

## Local Video Content (Offline Preview)

- `src/local-content/hero/` に配置したファイル → LPヒーロースライダーに表示
- `src/local-content/lp-grid/` に配置したファイル → LPの4x4ギャラリーに表示（最大16件）
- `src/local-content/dashboard/<category>/` に配置したファイル → ダッシュボードのカテゴリ別一覧に表示
- 対応拡張子: `.mp4`, `.webm`
- フォルダにファイルを追加すると Vite のHMRで自動反映されます（`npm run dev` 実行中）
- `beauty` フォルダ内のファイル名やフォルダに `skincare` / `haircare` / `oralcare` を含めると、美容サブカテゴリタグが自動付与されます

## MCP ツール連携

- Chrome DevTools MCP サーバーを導入済みです。Codex CLI から利用する場合は、ワークスペース直下の `.codex/config.toml` に以下の設定が追加されています。

  ```toml
  [mcp_servers.chrome-devtools]
  command = "npx"
  args = ["-y", "chrome-devtools-mcp@latest"]
  ```

- Codex CLI/エディタから `chrome-devtools` MCP サーバーを有効化すると、ローカル Chrome の操作やトレース取得が可能になります。
- Supabase MCP サーバーも設定済みです。`.codex/config.toml` のエントリを環境に合わせて編集し、`SUPABASE_SERVICE_ROLE_KEY` と `MCP_API_KEY` を適切な値に更新してください。

  ```toml
  [mcp_servers.supabase]
  command = "npx"
  args = ["-y", "supabase-mcp@latest", "supabase-mcp-claude"]
  env = {
    SUPABASE_URL = "http://localhost",
    SUPABASE_ANON_KEY = "dummy",
    SUPABASE_SERVICE_ROLE_KEY = "replace-with-service-role",
    MCP_API_KEY = "local-dev-mcp"
  }
  ```
