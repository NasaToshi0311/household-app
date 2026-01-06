# トラブルシューティングガイド

Household Appで発生する可能性のある問題とその解決方法をまとめています。

## 目次

- [サーバー関連](#サーバー関連)
- [ネットワーク関連](#ネットワーク関連)
- [認証関連](#認証関連)
- [データベース関連](#データベース関連)
- [同期関連](#同期関連)
- [クライアント関連](#クライアント関連)
- [その他の問題](#その他の問題)

## サーバー関連

### サーバーが起動しない

**症状**: `docker compose up -d`を実行してもサーバーが起動しない、またはすぐに停止する

**確認手順**:

1. **コンテナの状態を確認**
   ```bash
   cd server
   docker compose ps
   ```
   - すべてのコンテナが`Up`状態であることを確認
   - `Exit`状態の場合は、ログを確認

2. **ログを確認**
   ```bash
   docker compose logs api
   ```
   - エラーメッセージを確認
   - よくあるエラー:
     - `DATABASE_URL`が設定されていない
     - ポート8000が既に使用されている
     - 依存パッケージのインストールエラー

3. **ポートの競合を確認**
   ```bash
   # Windows
   netstat -ano | findstr :8000
   
   # Mac/Linux
   lsof -i :8000
   ```
   - ポート8000が使用されている場合は、他のプロセスを停止するか、`docker-compose.yml`でポートを変更

**解決方法**:

- 環境変数を確認: `docker-compose.yml`の`environment`セクションを確認
- コンテナを再起動: `docker compose restart api`
- 完全に再ビルド: `docker compose up -d --build`

### サーバーが応答しない

**症状**: サーバーは起動しているが、APIリクエストがタイムアウトする、またはエラーが返る

**確認手順**:

1. **ヘルスチェック**
   ```bash
   curl http://localhost:8000/health
   ```
   - `{"status":"ok"}`が返れば正常

2. **コンテナの状態を確認**
   ```bash
   docker compose ps
   ```

3. **ログを確認**
   ```bash
   docker compose logs -f api
   ```

**解決方法**:

- コンテナを再起動: `docker compose restart api`
- データベース接続を確認（後述の「データベース接続エラー」を参照）

### ログに大量のエラーが表示される

**症状**: ログに繰り返しエラーが表示される

**確認手順**:

```bash
docker compose logs api | grep -i error
```

**よくある原因**:

- データベース接続エラー
- APIキー認証エラー
- バリデーションエラー

**解決方法**: 各エラーの種類に応じて、以下の該当セクションを参照

## ネットワーク関連

### スマホからサーバーに接続できない

**症状**: スマホのブラウザで`http://[PCのIP]:8000/app`にアクセスできない

**確認手順**:

1. **PCとスマホが同じネットワークに接続されているか確認**
   - 同じWi-Fiネットワークに接続されているか
   - テザリングの場合は、PCがテザリングのホストになっているか

2. **PCのIPアドレスを確認**
   ```bash
   # Windows
   ipconfig
   
   # Mac/Linux
   ifconfig
   # または
   ip addr
   ```
   - 「IPv4アドレス」を確認（例: `192.168.1.100`）

3. **PCのファイアウォール設定を確認**
   - Windows: コントロールパネル > システムとセキュリティ > Windows Defender ファイアウォール
   - ポート8000が許可されているか確認
   - 必要に応じて、ポート8000を許可するルールを追加

4. **サーバーが起動しているか確認**
   ```bash
   curl http://localhost:8000/health
   ```

**解決方法**:

- ファイアウォールでポート8000を許可
- PCのIPアドレスを再確認（IPアドレスが変更されている可能性）
- ルーターの設定を確認（ポート転送など）

### QRコードが読み取れない

**症状**: QRコードを読み取っても設定が反映されない、またはQRコードが表示されない

**確認手順**:

1. **QRコードページにアクセスできるか確認**
   ```
   http://[PCのIP]:8000/sync/page
   ```
   - PCのブラウザでアクセスして、QRコードが表示されるか確認

2. **QRコードのURLを確認**
   ```
   http://[PCのIP]:8000/sync/url
   ```
   - JSONレスポンスが返るか確認
   - `base_url`と`api_key`が正しく含まれているか確認

3. **HOST_IP環境変数を確認**
   - `docker-compose.yml`の`HOST_IP`が正しく設定されているか
   - Dockerコンテナの内部IP（172.17.x.xなど）が返っている場合は、`HOST_IP`を明示的に設定

**解決方法**:

- `docker-compose.yml`に`HOST_IP`環境変数を追加:
  ```yaml
  environment:
    HOST_IP: "192.168.1.100"  # 実際のPCのIPアドレス
  ```
- コンテナを再起動: `docker compose restart api`
- 手動でURLとAPIキーを設定する方法を試す

### タイムアウトエラーが発生する

**症状**: 同期リクエストがタイムアウトする

**確認手順**:

1. **ネットワーク接続を確認**
   - PCとスマホが同じネットワークに接続されているか
   - ネットワークの速度が遅くないか

2. **サーバーのログを確認**
   ```bash
   docker compose logs -f api
   ```
   - リクエストが到達しているか確認

**解決方法**:

- タイムアウト時間は15秒に設定されています（テザリング環境を考慮）
- ネットワーク接続を改善する
- 同期するデータ量を減らす（1000件以下）

## 認証関連

### APIキーエラーが発生する

**症状**: HTTP 401エラーが返る、または「APIキーが設定されていません」というメッセージが表示される

**確認手順**:

1. **サーバー側のAPIキーを確認**
   ```bash
   # docker-compose.ymlを確認
   cat server/docker-compose.yml | grep API_KEY
   
   # または、コンテナ内の環境変数を確認
   docker compose exec api env | grep API_KEY
   ```

2. **クライアント側のAPIキーを確認**
   - ブラウザの開発者ツール > Application > Local Storage
   - `household_api_key`キーの値を確認

3. **APIキーの一致を確認**
   - サーバー側とクライアント側のAPIキーが一致しているか確認

**解決方法**:

1. **QRコードを再読み取り**
   - `http://[PCのIP]:8000/sync/page`にアクセス
   - QRコードを再読み取り

2. **手動でAPIキーを設定**
   - サーバー側のAPIキーを確認: `http://[PCのIP]:8000/sync/url`
   - クライアント側で手動設定（現在の実装では、QRコード読み取りのみ対応）

3. **localStorageをクリア**
   - ブラウザの開発者ツール > Application > Local Storage
   - `household_api_key`と`household_api_base_url`を削除
   - QRコードを再読み取り

### 認証エラーの詳細メッセージ

**エラーメッセージ別の対処法**:

- `"API key is missing"`: `X-API-Key`ヘッダーが送信されていません。QRコードを読み取って設定してください。
- `"Invalid API key"`: APIキーが一致していません。サーバー側とクライアント側のAPIキーを確認してください。

## データベース関連

### データベース接続エラー

**症状**: ログにデータベース接続エラーが表示される

**確認手順**:

1. **データベースコンテナが起動しているか確認**
   ```bash
   docker compose ps db
   ```

2. **データベースログを確認**
   ```bash
   docker compose logs db
   ```

3. **DATABASE_URL環境変数を確認**
   ```bash
   docker compose exec api env | grep DATABASE_URL
   ```

**解決方法**:

- データベースコンテナを再起動: `docker compose restart db`
- `docker-compose.yml`の`DATABASE_URL`を確認
- データベースコンテナが起動するまで待つ（初回起動時は時間がかかる場合がある）

### データが表示されない

**症状**: データベースにデータがあるはずなのに、アプリで表示されない

**確認手順**:

1. **データベースにデータが存在するか確認**
   ```bash
   docker compose exec db psql -U household -d household -c "SELECT COUNT(*) FROM expenses WHERE deleted_at IS NULL;"
   ```

2. **最新のデータを確認**
   ```bash
   docker compose exec db psql -U household -d household -c "SELECT * FROM expenses ORDER BY date DESC LIMIT 10;"
   ```

3. **論理削除されたデータを確認**
   ```bash
   docker compose exec db psql -U household -d household -c "SELECT COUNT(*) FROM expenses WHERE deleted_at IS NOT NULL;"
   ```

**解決方法**:

- データが存在する場合: クライアント側のIndexedDBを確認（後述）
- データが存在しない場合: 同期が成功しているか確認

### データベースのサイズが大きい

**症状**: データベースのサイズが予想以上に大きい

**確認手順**:

```bash
docker compose exec db psql -U household -d household -c "SELECT pg_size_pretty(pg_database_size('household'));"
```

**解決方法**:

- データベースの最適化（VACUUM）を実行:
  ```bash
  docker compose exec db psql -U household -d household -c "VACUUM ANALYZE expenses;"
  ```
- 論理削除されたデータを物理削除（注意: データは復元できません）:
  ```sql
  DELETE FROM expenses WHERE deleted_at IS NOT NULL;
  ```

## 同期関連

### 同期が失敗する

**症状**: 「同期する」ボタンを押してもエラーが表示される、または同期が完了しない

**確認手順**:

1. **APIログを確認**
   ```bash
   docker compose logs -f api
   ```
   - リクエストが到達しているか確認
   - エラーメッセージを確認

2. **ネットワーク接続を確認**
   - スマホがオンラインか確認
   - PCとスマホが同じネットワークに接続されているか

3. **APIキーを確認**
   - サーバー側とクライアント側のAPIキーが一致しているか

4. **同期するデータ量を確認**
   - 1000件以下であることを確認

**解決方法**:

- ネットワーク接続を確認
- APIキーを再設定（QRコードを再読み取り）
- 同期するデータ量を減らす
- サーバーのログを確認して、具体的なエラー原因を特定

### 同期が成功したがデータが反映されない

**症状**: 同期は成功したが、データベースにデータが保存されていない

**確認手順**:

1. **同期レスポンスを確認**
   - クライアント側で`ok_uuids`と`ng_uuids`を確認
   - `ng_uuids`に含まれている場合は、そのアイテムの同期が失敗

2. **データベースを確認**
   ```bash
   docker compose exec db psql -U household -d household -c "SELECT * FROM expenses WHERE client_uuid = 'your-uuid';"
   ```

**解決方法**:

- `ng_uuids`に含まれているアイテムは、次回の同期で再試行される
- サーバーのログを確認して、失敗原因を特定
- データのバリデーションエラーがないか確認（金額、カテゴリ、日付など）

### 重複データが作成される

**症状**: 同じデータが複数回同期されて、重複が発生する

**確認手順**:

```bash
docker compose exec db psql -U household -d household -c "SELECT client_uuid, COUNT(*) FROM expenses GROUP BY client_uuid HAVING COUNT(*) > 1;"
```

**解決方法**:

- 通常、`client_uuid`が一意キーとして設定されているため、重複は発生しません
- 重複が発生している場合は、データベースの制約を確認
- 重複データを削除:
  ```sql
  DELETE FROM expenses WHERE id NOT IN (
    SELECT MIN(id) FROM expenses GROUP BY client_uuid
  );
  ```

## クライアント関連

### IndexedDBのデータが表示されない

**症状**: 入力したデータが表示されない、または集計結果が正しくない

**確認手順**:

1. **ブラウザの開発者ツールでIndexedDBを確認**
   - Chrome/Edge: F12 > Application > IndexedDB > household-db > expenses
   - データが存在するか確認

2. **データの状態を確認**
   - `status`が`pending`か`synced`か確認
   - `op`が`upsert`か`delete`か確認

**解決方法**:

- IndexedDBをクリア（注意: データは失われます）:
  - ブラウザの開発者ツール > Application > IndexedDB > household-db > 右クリック > Delete
- アプリを再読み込み
- データを再入力

### PWAが動作しない

**症状**: PWAとしてホーム画面に追加できない、またはオフラインで動作しない

**確認手順**:

1. **HTTPSまたはlocalhostでアクセスしているか確認**
   - PWAはHTTPSまたはlocalhostでのみ動作します
   - 本番環境では`http://[PCのIP]:8000/app`でアクセス

2. **Service Workerが登録されているか確認**
   - ブラウザの開発者ツール > Application > Service Workers
   - Service Workerが登録されているか確認

**解決方法**:

- ブラウザのキャッシュをクリア
- Service Workerを再登録:
  - ブラウザの開発者ツール > Application > Service Workers > Unregister
  - ページを再読み込み

### アプリが表示されない

**症状**: ブラウザでアプリにアクセスしても、白い画面が表示される

**確認手順**:

1. **ブラウザのコンソールを確認**
   - F12 > Console
   - エラーメッセージを確認

2. **ネットワークタブを確認**
   - F12 > Network
   - リソースの読み込みに失敗していないか確認

**解決方法**:

- ブラウザのキャッシュをクリア
- ページを再読み込み（Ctrl+F5 / Cmd+Shift+R）
- サーバーが起動しているか確認

## その他の問題

### バックアップが失敗する

**症状**: `backup_db.ps1`を実行してもバックアップが作成されない

**確認手順**:

1. **PowerShellの実行ポリシーを確認**
   ```powershell
   Get-ExecutionPolicy
   ```

2. **OneDriveのパスを確認**
   - `backup_db.ps1`内のOneDriveパスが正しいか確認

**解決方法**:

- 実行ポリシーを変更（管理者権限が必要）:
  ```powershell
  Set-ExecutionPolicy RemoteSigned
  ```
- OneDriveのパスを確認・修正
- 手動でバックアップを実行:
  ```bash
  docker compose exec -T db pg_dump -U household household > backup.sql
  ```

### パフォーマンスが遅い

**症状**: APIリクエストの応答が遅い、または集計処理に時間がかかる

**確認手順**:

1. **データベースのサイズを確認**
   ```bash
   docker compose exec db psql -U household -d household -c "SELECT pg_size_pretty(pg_database_size('household'));"
   ```

2. **インデックスの使用状況を確認**
   ```sql
   EXPLAIN ANALYZE SELECT * FROM expenses WHERE date >= '2024-01-01' AND date <= '2024-01-31';
   ```

**解決方法**:

- データベースの最適化:
  ```bash
  docker compose exec db psql -U household -d household -c "VACUUM ANALYZE expenses;"
  ```
- インデックスの追加（必要に応じて）:
  ```sql
  CREATE INDEX idx_expenses_date ON expenses(date);
  ```

### 環境変数が反映されない

**症状**: `docker-compose.yml`で環境変数を変更したが、反映されない

**確認手順**:

```bash
docker compose exec api env | grep -E "API_KEY|DATABASE_URL|CORS_ORIGINS|HOST_IP"
```

**解決方法**:

- コンテナを再作成:
  ```bash
  docker compose up -d --force-recreate api
  ```
- または、完全に再ビルド:
  ```bash
  docker compose down
  docker compose up -d --build
  ```

## ログの確認方法

### APIログ

```bash
# リアルタイムでログを確認
docker compose logs -f api

# 最新100行を表示
docker compose logs --tail=100 api

# 特定の文字列を検索
docker compose logs api | grep -i error
```

### データベースログ

```bash
docker compose logs -f db
```

### すべてのログ

```bash
docker compose logs -f
```

## サポート

問題が解決しない場合は、以下を確認してください：

1. **ドキュメントを確認**
   - [セットアップガイド](SETUP.md)
   - [運用・保守ガイド](OPERATIONS.md)
   - [アーキテクチャ](architecture.md)

2. **ログを確認**
   - エラーメッセージを記録
   - 発生した操作手順を記録

3. **環境情報を確認**
   - OSのバージョン
   - Dockerのバージョン
   - ブラウザの種類とバージョン

