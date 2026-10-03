# server/backup_db.ps1 を毎日12:00に自動実行するタスクを、Windowsのタスクスケジューラに登録する。
# PCが起動していない時間帯は単にタスクが実行されないだけで、PCを自動起動させる設定は行わない。
# （household-db が起動していない場合は backup_db.ps1 側がスキップしてログに記録する）
#
# 実行方法（このファイルがあるディレクトリで）:
#   .\register_backup_task.ps1
#
# 再実行すると、同名タスクを削除して再登録する（設定を変えたい場合はこのスクリプトを編集して再実行）。

$ErrorActionPreference = "Stop"

$taskName = "HouseholdApp-DbBackup"
$scriptPath = Join-Path $PSScriptRoot "backup_db.ps1"

if (-not (Test-Path $scriptPath)) {
    throw "backup_db.ps1 が見つかりません: $scriptPath"
}

$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""

$trigger = New-ScheduledTaskTrigger -Daily -At "12:00"

# ログオンしているときだけ実行（PCの自動起動はしない）
$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -DontStopOnIdleEnd `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1)

if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "既存タスク '$taskName' を削除しました。"
}

Register-ScheduledTask `
    -TaskName $taskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "household-app のDBを毎日バックアップする（server/backup_db.ps1）。PCが起動していない時間帯はスキップされる。" |
    Out-Null

Write-Host "タスク '$taskName' を登録しました（毎日12:00実行）。"
Write-Host "確認: Get-ScheduledTask -TaskName '$taskName' | Get-ScheduledTaskInfo"
Write-Host "手動実行して試す: Start-ScheduledTask -TaskName '$taskName'"
Write-Host "削除する場合: Unregister-ScheduledTask -TaskName '$taskName'"

