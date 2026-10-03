# 運用・保守ガイド

Household Appの日常的な運用と保守に関する情報です。

## コマンドリファレンス

### Docker・サーバー操作

```bash
# Docker起動（DB・APIを立ち上げる）
cd server
docker compose up -d

# 起動状態の確認
docker compose ps

# 再起動（設定変更後）
docker compose restart api

# ログ確認（エラー調査）
docker compose logs -f api

# 停止
docker compose down
```

### フロントエンド開発

```bash
# 開発サーバー起動
cd client
npm run dev

# 本番ビルド
npm run build
```

詳細は `client/README.md` を参照してください。

## データベースバックアップ

### 手動バックアップ

```bash
# DBバックアップ作成
cd server
docker compose exec -T db pg_dump -U household household > expenses_YYYY-MM-DD.sql

# 復元（戻したいファイル名を記載）
docker compose exec -T db psql -U household -d household < expenses_YYYY-MM-DD.sql
```

### 自動バックアップ（PowerShellスクリプト＋タスクスケジューラ）

`server/backup_db.ps1` を実行すると、以下の処理が行われます：

- OneDriveの `household-app-backup/db` ディレクトリにバックアップを保存（Gitには含まれない）
- 30日より古いSQLファイルを自動削除
- ファイル名は `expenses_YYYY-MM-DD.sql` 形式
- `household-db` コンテナが起動していない場合は、エラーにせずスキップし、その旨を `household-app-backup/backup.log` に記録する
- 実行結果（成功・スキップ・失敗）はすべて `household-app-backup/backup.log` に記録される

```powershell
cd server
.\backup_db.ps1
```

**毎日自動実行する設定**:

```powershell
cd server
.\register_backup_task.ps1
```

Windowsのタスクスケジューラに `HouseholdApp-DbBackup` という名前のタスクが登録され、毎日12:00に実行されます。PCの電源を入れる自動化は行っていないため、PCが起動していない時間帯は単に実行されず、次にPCが起動したタイミングでは翌日の12:00まで待つ形になります（household-dbが起動していない場合は上記のとおりスキップされます）。

- 状態確認: `Get-ScheduledTask -TaskName 'HouseholdApp-DbBackup' | Get-ScheduledTaskInfo`
- 手動実行: `Start-ScheduledTask -TaskName 'HouseholdApp-DbBackup'`
- 削除: `Unregister-ScheduledTask -TaskName 'HouseholdApp-DbBackup'`
- 実行時刻を変更したい場合は `server/register_backup_task.ps1` 内の `New-ScheduledTaskTrigger -Daily -At "12:00"` を編集して再実行する（既存タスクは自動的に再登録される）

**実行結果の確認**（ログファイル: `%USERPROFILE%\OneDrive\household-app-backup\backup.log`）:

```powershell
Get-Content "$env:USERPROFILE\OneDrive\household-app-backup\backup.log" -Tail 20
```

ログの各行は3パターン：

| ログの内容 | 意味 |
|---|---|
| `OK: Backup saved to ...` | バックアップ成功 |
| `SKIP: household-db is not running.` | サーバー未起動のため実行をスキップ（異常ではない） |
| `ERROR: Backup failed - ...` | pg_dump自体が失敗（DB接続エラー等） |

`SKIP`が続いていて困る場合は、サーバーを起動しておく時間帯にタスクの実行時刻（現在は12:00）を合わせるのが確実です。詳しいトラブル対応は [TROUBLESHOOTING.md](TROUBLESHOOTING.md) の「バックアップが失敗する・作成されない」を参照してください。

## 本番環境への反映手順

### フロントエンド修正時

`client/` を修正して `master` にpushすると、Vercelが自動的にビルド・デプロイします（`https://household-app.vercel.app`）。スマホは次回起動時に自動更新されます。サーバー側での作業は不要です。

### サーバー側のコード修正時

```bash
# コードを修正後、コンテナを再起動
cd server
docker compose restart api

# または、完全に再ビルドする場合
docker compose up -d --build
```

## データベース操作

**注意**: DBのポート（5432）は`127.0.0.1`のみで待受しており、LANの他の機器からは接続できません。PC上から直接接続する場合は以下のように`docker compose exec`を使います。

### データベースに接続

```bash
cd server
docker compose exec db psql -U household -d household
```

### よく使うSQLコマンド

```sql
-- テーブル一覧
\dt

-- テーブル構造
\d expenses

-- データ確認（最新10件）
SELECT * FROM expenses ORDER BY date DESC LIMIT 10;

-- 論理削除されたデータも含めて確認
SELECT * FROM expenses WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC;

-- 特定の期間のデータを確認
SELECT * FROM expenses 
WHERE date >= '2024-01-01' AND date <= '2024-01-31' 
AND deleted_at IS NULL 
ORDER BY date DESC;
```

## ログの確認

### APIログ

```bash
cd server
docker compose logs -f api
```

### データベースログ

```bash
cd server
docker compose logs -f db
```

### すべてのログ

```bash
cd server
docker compose logs -f
```

## パフォーマンス確認

### データベースサイズの確認

```bash
cd server
docker compose exec db psql -U household -d household -c "SELECT pg_size_pretty(pg_database_size('household'));"
```

### テーブルサイズの確認

```bash
cd server
docker compose exec db psql -U household -d household -c "SELECT pg_size_pretty(pg_total_relation_size('expenses'));"
```

## トラブルシューティング

### サーバーが応答しない

1. コンテナの状態を確認
   ```bash
   docker compose ps
   ```

2. ログを確認
   ```bash
   docker compose logs api
   ```

3. コンテナを再起動
   ```bash
   docker compose restart api
   ```

### データベース接続エラー

1. データベースコンテナが起動しているか確認
   ```bash
   docker compose ps db
   ```

2. データベースログを確認
   ```bash
   docker compose logs db
   ```

3. データベースコンテナを再起動
   ```bash
   docker compose restart db
   ```

### 同期が失敗する

1. APIログを確認
   ```bash
   docker compose logs -f api
   ```

2. ネットワーク接続を確認
   - Tailscale Funnelが有効か確認: `tailscale funnel status`
   - PC側で `http://localhost:8000/health` にアクセスしてサーバーが起動しているか確認

3. APIキーが正しいか確認
   - サーバー側の `API_KEY`（`server/.env`）
   - クライアント側のAPIキー設定（localStorage）
   - QRコードを再読み取りして設定を更新

4. 認証エラー（HTTP 401）の場合
   - サーバー側とクライアント側のAPIキーが一致しているか確認
   - `http://[PCのIP]:8000/sync/url` にアクセスしてAPIキーを確認
   - クライアント側のlocalStorageをクリアしてQRコードを再読み取り

### データが表示されない

1. データベースにデータが存在するか確認
   ```bash
   docker compose exec db psql -U household -d household -c "SELECT COUNT(*) FROM expenses WHERE deleted_at IS NULL;"
   ```

2. クライアント側のIndexedDBを確認
   - ブラウザの開発者ツールでApplication > IndexedDBを確認

## 定期メンテナンス

### 推奨される定期作業

1. **週次**: データベースバックアップの実行
2. **月次**: ログの確認と不要なログの削除
3. **四半期**: データベースの最適化（VACUUM）

### データベースの最適化

```bash
cd server
docker compose exec db psql -U household -d household -c "VACUUM ANALYZE expenses;"
```

