$ErrorActionPreference = "Stop"

$project = "C:\dev\household-app\server"
$destDir = Join-Path $env:USERPROFILE "OneDrive\household-app-backup\db"
New-Item -ItemType Directory -Force -Path $destDir | Out-Null

# ▼ 追加：30日より古いSQLを削除
Get-ChildItem -Path $destDir -Filter "expenses_*.sql" -File |
  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
  Remove-Item -Force

$fname = "expenses_{0}.sql" -f (Get-Date -Format "yyyy-MM-dd")
$outFile = Join-Path $destDir $fname

Set-Location $project

# ここがバックアップ本体
docker compose exec -T db pg_dump -U household household |
  Out-File -Encoding utf8 $outFile

Write-Host "Backup saved: $outFile"
