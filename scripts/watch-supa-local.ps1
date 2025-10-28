$ErrorActionPreference = 'Stop'

# Resolve repo root as this script's parent directory
$PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repo = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $repo

Write-Host "[supa-watch] cwd = $repo"

# Ensure .env exists
if (-not (Test-Path (Join-Path $repo '.env'))) {
  Write-Warning ".env が見つかりません。src/tools/supa-watch.ts は dotenv で .env を読み込みます。最初に .env を作成してください。"
}

# Launch watcher (hidden window when used by Scheduled Task)
npx --yes tsx src/tools/supa-watch.ts --dir "./project-bolt-sb1-a6rmxyri/project/src/local-content" --bucket videos --scheme dir

