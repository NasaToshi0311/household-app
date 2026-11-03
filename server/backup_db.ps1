$ErrorActionPreference = "Stop"

$Project = "C:\dev\household-app\server"
$BackupRoot = Join-Path $env:USERPROFILE "household-app-backup"
$BackupDir = Join-Path $BackupRoot "db"
$LogFile = Join-Path $BackupRoot "backup.log"

function Write-Log {
    param([string]$Message)
    $line = "{0} {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
    Add-Content -Path $LogFile -Value $line -Encoding utf8
    Write-Host $line
}

# household-db コンテナが起動しているか確認する
# （サーバーはPC起動時に自動では立ち上げない運用のため、起動していない時間帯がある）
function Test-DbRunning {
    $status = docker compose ps db --format json 2>$null | ConvertFrom-Json
    return [bool]($status -and $status.State -eq "running")
}

# pg_dump でバックアップを取得し、保存先のパスを返す
# PowerShell のパイプを通すと実行環境によって日本語が文字化けするので、コンテナ内に出力してコピーする
function Backup-Database {
    # 同じ日に何度実行しても上書きしないよう、ファイル名に時刻まで入れる
    $fileName = "expenses_{0}.sql" -f (Get-Date -Format "yyyy-MM-dd_HHmmss")
    $outFile = Join-Path $BackupDir $fileName
    $tmpFile = "/tmp/household_backup.sql"

    docker compose exec -T db pg_dump -U household -f $tmpFile household
    if ($LASTEXITCODE -ne 0) { throw "pg_dump failed (exit code $LASTEXITCODE)" }
    docker compose cp "db:$tmpFile" $outFile
    if ($LASTEXITCODE -ne 0) { throw "docker compose cp failed (exit code $LASTEXITCODE)" }
    docker compose exec -T db rm -f $tmpFile

    if (-not (Select-String -Path $outFile -SimpleMatch "PostgreSQL database dump complete" -Encoding UTF8 -Quiet)) {
        throw "backup file is incomplete: $outFile"
    }
    return $outFile
}

# ===== メイン処理 =====

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
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

