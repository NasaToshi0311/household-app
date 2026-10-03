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

**症状**: スマホで同期がタイムアウトする、またはエラーになる

**確認手順**:

1. **Tailscale Funnelが有効か確認**
   ```bash
   tailscale funnel status
   ```
   - 公開URL（`https://pc2023.tail5d0b68.ts.net`など）が表示されるか確認

2. **PC側でサーバーが起動しているか確認**
   ```bash
   curl http://localhost:8000/health
   ```

3. **`server/.env`の`PUBLIC_BASE_URL`を確認**
   - Tailscale Funnelの公開URLと一致しているか確認

**解決方法**:

- Tailscale Funnelを再起動: `tailscale funnel --https=443 off` の後に `tailscale funnel --bg 8000`
- PCがスリープ・シャットダウンしていないか確認（サーバーはPC起動時に自動では立ち上がらない運用のため、`docker compose up -d`し直す必要がある場合がある）
- `server/.env`を変更した場合は`docker compose up -d --force-recreate api`で反映

### QRコードが読み取れない

**症状**: QRコードを読み取っても設定が反映されない、またはQRコードが表示されない

**確認手順**:

1. **QRコードページにアクセスできるか確認**
   ```
   http://localhost:8000/sync/page
   ```
   - PC本体かLAN内の端末のブラウザでアクセスして、QRコードが表示されるか確認
   - このページは外部（Tailscale Funnel経由）からは開けない仕様（LAN限定ミドルウェア）

2. **QRコードのURLを確認**
   ```
   http://localhost:8000/sync/url
   ```
   - JSONレスポンスが返るか確認
   - `base_url`と`api_key`が正しく含まれているか確認
   - QRコードには `https://household-app.vercel.app/#base_url={URL}&api_key={KEY}` 形式のURLが含まれます

3. **`PUBLIC_BASE_URL`環境変数を確認**
   - `server/.env`の`PUBLIC_BASE_URL`が正しく設定されているか
   - 未設定の場合はLAN内IPが使われるため、外部（モバイル回線）からは同期できない

**解決方法**:

- `server/.env`に`PUBLIC_BASE_URL`を設定（Tailscale FunnelのhttpsURL）
- コンテナを再作成: `docker compose up -d --force-recreate api`
- 手動でURLとAPIキーを設定する方法を試す

### タイムアウトエラーが発生する

**症状**: 同期リクエストがタイムアウトする

**確認手順**:

1. **ネットワーク接続を確認**
   - スマホの回線速度が遅くないか
   - Tailscale Funnel経由の接続が不安定でないか（`tailscale funnel status`）

2. **サーバーのログを確認**
   ```bash
   docker compose logs -f api
   ```
   - リクエストが到達しているか確認

**解決方法**:

- タイムアウト時間は15秒に設定されています（モバイル回線での遅延を考慮）
- ネットワーク接続を改善する
- 同期するデータ量を減らす（1000件以下）

## 認証関連

### APIキーエラーが発生する

**症状**: HTTP 401エラーが返る、または「APIキーが設定されていません」というメッセージが表示される

**確認手順**:

1. **サーバー側のAPIキーを確認**
   ```bash
   # server/.env を確認（このファイルはGitには含まれない）
   cat server/.env

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

**よくあるエラーメッセージ**:
- `"サーバーからデータを取得できませんでした。load failed"`: ネットワークエラー（iOS Safariでよく発生）
- `"タイムアウト"`: サーバーへの接続に時間がかかりすぎている
- `"認証に失敗しました"`: APIキーが一致していない

**確認手順**:

1. **APIログを確認**
   ```bash
   docker compose logs -f api
   ```
   - リクエストが到達しているか確認
   - エラーメッセージを確認

2. **ネットワーク接続を確認**
   - スマホがオンラインか確認
   - Tailscale Funnelが有効か確認（`tailscale funnel status`）
   - PC側で `http://localhost:8000/health` にアクセスしてサーバーが起動しているか確認

3. **APIキーを確認**
   - サーバー側とクライアント側のAPIキーが一致しているか
   - 設定画面で現在の設定値を確認

4. **同期するデータ量を確認**
   - 1000件以下であることを確認

5. **設定値を確認**
   - 設定画面を開いて、現在のAPI URLとAPIキーを確認
   - API URLがTailscale Funnelの公開URL（`https://pc2023.tail5d0b68.ts.net`など）になっているか

**解決方法**:

- ネットワーク接続を確認（Tailscale Funnelが有効か、スマホがオンラインか）
- サーバーが起動しているか確認（`docker compose ps`）
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
   - 本番環境では`https://household-app.vercel.app`でアクセス

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

### バックアップが失敗する・作成されない

**症状**: 自動バックアップ（タスクスケジューラ）を設定したのに、`expenses_YYYY-MM-DD.sql`が増えていない

**確認手順**:

1. **まずログを確認する**（原因の9割はここで分かります）
   ```powershell
   Get-Content "$env:USERPROFILE\OneDrive\household-app-backup\backup.log" -Tail 20
   ```
   - `OK: Backup saved to ...` → 正常に成功している
   - `SKIP: household-db is not running.` → **これは異常ではありません**。サーバー（`docker compose up -d`）を起動していない時間帯にタスクが実行されると、エラーにせずスキップする仕様です。サーバーを起動してからタスクを手動実行するか、翌日の実行を待ってください
   - `ERROR: Backup failed - ...` → pg_dump自体が失敗している。エラーメッセージの内容を確認

2. **タスクスケジューラの実行結果を確認**
   ```powershell
   Get-ScheduledTask -TaskName 'HouseholdApp-DbBackup' | Get-ScheduledTaskInfo
   ```
   - `LastTaskResult` が `0` 以外の場合、スクリプト自体が実行できていない可能性がある（PowerShellの実行ポリシーなど）
   - `LastRunTime` が想定より古い場合、タスクが登録されていない・無効化されている可能性がある

3. **PowerShellの実行ポリシーを確認**
   ```powershell
   Get-ExecutionPolicy
   ```
   タスクは`-ExecutionPolicy Bypass`で実行されるため通常は問題にならないが、手動実行時にエラーになる場合はここを確認

4. **タスクが登録されているか確認**
   ```powershell
   Get-ScheduledTask -TaskName 'HouseholdApp-DbBackup'
   ```
   登録されていない場合は `server/register_backup_task.ps1` を実行

**解決方法**:

- サーバーが起動している状態で手動実行して確認:
  ```powershell
  cd server
  .\backup_db.ps1
  ```
  （`household-db`が起動していれば`OK`、起動していなければ`SKIP`がログに記録される。どちらになるかで原因が分かる）
- 実行ポリシーを変更する場合（管理者権限が必要）:
  ```powershell
  Set-ExecutionPolicy RemoteSigned
  ```
- タスクを登録し直す: `.\register_backup_task.ps1`（既存タスクは自動的に削除・再登録される）
- 手動でバックアップを取る:
  ```bash
  docker compose exec -T db pg_dump -U household household > backup.sql
  ```

詳細は [OPERATIONS.md](OPERATIONS.md) の「データベースバックアップ」も参照してください。

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

