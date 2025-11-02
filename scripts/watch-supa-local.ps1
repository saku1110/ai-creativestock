$ErrorActionPreference = 'Stop'

# Resolve repo root as this script's parent directory
$PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repo = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $repo

Write-Host "[supa-watch] cwd = $repo"

# Ensure .env exists
if (-not (Test-Path (Join-Path $repo '.env'))) {
  Write-Warning ".env ‚ªŒ©‚Â‚©‚è‚Ü‚¹‚ñBsrc/tools/supa-watch.ts ‚Í dotenv ‚Å .env ‚ğ“Ç‚İ‚İ‚Ü‚·BÅ‰‚É .env ‚ğì¬‚µ‚Ä‚­‚¾‚³‚¢B"
}

# Ensure bucket exists (idempotent)
npx --yes tsx src/tools/ensure-bucket.ts --bucket local-content --public

# One-off bulk upload existing files to keep LP up to date
pushd "project-bolt-sb1-a6rmxyri/project" | Out-Null
npx --yes tsx scripts/upload-local-content.ts
popd | Out-Null

# Launch watcher (hidden window when used by Scheduled Task)
npx --yes tsx src/tools/supa-watch.ts --dir "./project-bolt-sb1-a6rmxyri/project/src/local-content" --bucket local-content --scheme dir

