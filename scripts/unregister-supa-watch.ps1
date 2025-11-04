param([string]$TaskName = 'SupabaseAutoUpload')
try {
  if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false | Out-Null
    Write-Host "[supa-watch] タスクを削除しました: $TaskName"
  } else {
    Write-Host "[supa-watch] タスクが見つかりません: $TaskName"
  }
} catch {
  Write-Warning $_
}

