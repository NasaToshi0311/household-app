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

### 自動バックアップ（PowerShellスクリプト）

`server/backup_db.ps1` を実行すると、以下の処理が行われます：

- OneDriveの `household-app-backup/db` ディレクトリにバックアップを保存
- 30日より古いSQLファイルを自動削除
- ファイル名は `expenses_YYYY-MM-DD.sql` 形式

```powershell
cd server
.\backup_db.ps1
```

**注意**: バックアップは OneDrive に自動保存されます。定期的に実行することを推奨します。

## 本番環境への反映手順

フロントエンド（React）を修正した場合は、以下の手順で本番環境に反映します。

### フロントエンド修正時

```bash
# Reactを本番ビルド
cd client
npm run build

# ビルド結果をサーバー側に反映
cd ..
xcopy client\dist server\static\dist /E /I /Y

# APIコンテナを再起動（確実に反映させる）
cd server
docker compose restart api
```

### サーバー側のコード修正時

```bash
# コードを修正後、コンテナを再起動
cd server
docker compose restart api

# または、完全に再ビルドする場合
docker compose up -d --build
```

## データベース操作

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
   - PCとスマホが同じネットワークに接続されているか
   - ファイアウォールの設定を確認

3. APIキーが正しいか確認
   - サーバー側の `API_KEY` 環境変数
   - クライアント側のAPIキー設定

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

