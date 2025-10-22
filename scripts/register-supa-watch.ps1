$ErrorActionPreference = 'Stop'

param(
  [string]$TaskName = 'SupabaseAutoUpload',
  [string]$RepoPath
)

if (-not $RepoPath) {
  $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
  $RepoPath = Resolve-Path (Join-Path $scriptDir '..')
}

$watchScript = Resolve-Path (Join-Path $RepoPath 'scripts/watch-supa-local.ps1')
if (-not (Test-Path $watchScript)) {
  throw "watch-supa-local.ps1 が見つかりません: $watchScript"
}

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$watchScript`""
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest
$task = New-ScheduledTask -Action $action -Trigger $trigger -Settings $settings -Principal $principal

try {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false | Out-Null
  }
} catch {}

Register-ScheduledTask -TaskName $TaskName -InputObject $task | Out-Null
Write-Host "[supa-watch] タスクを登録しました: $TaskName"
Write-Host "[supa-watch] 次回ログオン時から自動起動します。今すぐ起動するには下記を実行:\n  powershell -ExecutionPolicy Bypass -File `"$watchScript`""

