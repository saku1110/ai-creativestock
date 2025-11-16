# ai-creativestock

## Supabase Storage へのローカル動画アップロード
ローカル開発用の src/local-content 配下の動画は Git 管理には含めず、Supabase Storage にアップロードして利用します。

1. Supabase プロジェクトで local-content など任意の公開バケットを作成し、読み取りを許可します。
2. .env などに下記を設定します。
   `ash
   SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   SUPABASE_STORAGE_BUCKET=local-content
   SUPABASE_STORAGE_PREFIX=local-content
   `
3. 
pm run upload:local-content を実行すると、src/local-content 以下の mp4 / webm / mov をアップロードし、公開 URL 一覧を src/local-content/remote-manifest.ts に自動生成します。
4. フロントエンドは生成されたマニフェストを参照し、Supabase に存在する場合はその URL を優先して再生します。

> **Note**: このスクリプトは SUPABASE_SERVICE_ROLE_KEY を使用するため、信頼できるローカル環境からのみ実行してください。

## ダッシュボードタグの反映ルール
- ダッシュボードの動画カードに表示されるタグは project/temp/dashboard-review-labeled.csv に記載された inal_age / inal_gender / inal_tags の内容のみを利用します。Supabase の ideo_assets.tags やその他の自動タグは使用しません。
- CSV を更新したら project ディレクトリで 
px tsx scripts/generate-dashboard-thumb-map.ts を実行し、dashboardThumbMap.generated.ts を再生成してください。生成物を通じてダッシュボードは常に CSV 由来のタグのみを読み込みます。