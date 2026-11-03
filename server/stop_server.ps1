# バックアップを取り、先月分の合計を Notion に送ってからサーバーを停止する（stop_server.bat をダブルクリックする）
# スマホの同期が終わってから実行すること
$ProgressPreference = "SilentlyContinue"
Set-Location $PSScriptRoot

Write-Host "バックアップを取っています..."
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "backup_db.ps1")
if ($LASTEXITCODE -ne 0) {
    Write-Host "失敗: バックアップを取れなかったので、サーバーは止めません。"
    exit 1
}

# Notion に送れなくても次回の停止時に送り直されるので、ここでは止めない
Write-Host "先月分を Notion に送っています..."
$apiKeyLine = Get-Content ".env" | Where-Object { $_ -match "^\s*API_KEY=" } | Select-Object -First 1
$apiKey = ($apiKeyLine -replace "^\s*API_KEY=", "").Trim().Trim('"', "'")
try {
    $result = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/notion/sync" -Headers @{ "X-API-Key" = $apiKey } -TimeoutSec 120
    Write-Host "$($result.month) 分を送りました。"
} catch {
    Write-Host "注意: Notion に送れませんでした（次回の停止時に送り直します）: $($_.Exception.Message)"
}

docker compose stop
if ($LASTEXITCODE -ne 0) {
    Write-Host "失敗: サーバーを停止できませんでした。"
    exit 1
}

Write-Host ""
Write-Host "停止しました。"
