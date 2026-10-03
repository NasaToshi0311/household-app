$ErrorActionPreference = "Stop"

$Project = "C:\dev\household-app\server"
$BackupRoot = Join-Path $env:USERPROFILE "OneDrive\household-app-backup"
$BackupDir = Join-Path $BackupRoot "db"
$LogFile = Join-Path $BackupRoot "backup.log"
$RetentionDays = 30

function Write-Log {
    param([string]$Message)
    $line = "{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
    Add-Content -Path $LogFile -Value $line -Encoding utf8
    Write-Host $line
}

# 保存期限（$RetentionDays）を過ぎたバックアップを削除する
function Remove-OldBackups {
    Get-ChildItem -Path $BackupDir -Filter "expenses_*.sql" -File |
        Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays) } |
        Remove-Item -Force
}

# household-db コンテナが起動しているか確認する
# （サーバーはPC起動時に自動では立ち上げない運用のため、起動していない時間帯がある）
function Test-DbRunning {
    $status = docker compose ps db --format json 2>$null | ConvertFrom-Json
    return [bool]($status -and $status.State -eq "running")
}

# pg_dump でバックアップを取得し、保存先のパスを返す
function Backup-Database {
    $fileName = "expenses_{0}.sql" -f (Get-Date -Format "yyyy-MM-dd")
    $outFile = Join-Path $BackupDir $fileName
    docker compose exec -T db pg_dump -U household household |
        Out-File -Encoding utf8 $outFile
    return $outFile
}

# ===== メイン処理 =====

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
Remove-OldBackups

Set-Location $Project

if (-not (Test-DbRunning)) {
    Write-Log "SKIP: household-db is not running."
    exit 0
}

try {
    $savedFile = Backup-Database
    Write-Log "OK: Backup saved to $savedFile"
} catch {
    Write-Log "ERROR: Backup failed - $_"
    exit 1
}

