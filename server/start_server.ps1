# サーバー（API + DB）を起動する。同期したいときに start_server.bat をダブルクリックする
$ProgressPreference = "SilentlyContinue"
Set-Location $PSScriptRoot

function Test-Docker {
    docker info *> $null
    return $LASTEXITCODE -eq 0
}

if (-not (Test-Docker)) {
    Write-Host "Docker Desktop を起動しています..."
    Start-Process (Join-Path $env:ProgramFiles "Docker\Docker\Docker Desktop.exe")
    $deadline = (Get-Date).AddMinutes(3)
    while (-not (Test-Docker)) {
        if ((Get-Date) -gt $deadline) {
            Write-Host "失敗: Docker Desktop が3分以内に起動しませんでした。"
            exit 1
        }
        Start-Sleep -Seconds 3
    }
}

docker compose up -d --wait
if ($LASTEXITCODE -ne 0) {
    Write-Host "失敗: サーバーを起動できませんでした。"
    exit 1
}

# uvicorn の起動が終わるまで待つ
$deadline = (Get-Date).AddMinutes(1)
while ($true) {
    try {
        Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:8000/health" -TimeoutSec 3 | Out-Null
        break
    } catch {
        if ((Get-Date) -gt $deadline) {
            Write-Host "失敗: API が応答しません。docker logs household-api を確認してください。"
            exit 1
        }
        Start-Sleep -Seconds 1
    }
}

if (-not ((tailscale funnel status | Out-String) -match "Funnel on")) {
    Write-Host "注意: Tailscale Funnel がオフです。tailscale funnel --bg 8000 を実行してください。"
    exit 1
}

Write-Host ""
Write-Host "起動しました。スマホで同期してください。"
Write-Host "同期が終わったら stop_server.bat で停止してください。"
