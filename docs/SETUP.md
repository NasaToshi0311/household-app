# セットアップガイド

Household Appのセットアップ手順を説明します。

## 前提条件

- PCに Docker / Docker Compose がインストールされていること
- Node.js（npm）がインストールされていること
- PCとスマホが同一ネットワークに接続されていること

## 初回セットアップ

### 1. サーバーの起動

```bash
cd server
docker compose up -d
```

サーバーが起動すると、以下のサービスが利用可能になります：
- FastAPI: `http://localhost:8000`
- PostgreSQL: `localhost:5432`

### 2. PCのIPアドレスを確認

サーバーに接続するため、PCのIPアドレスを確認します。

**Windows:**
```bash
ipconfig
```
「IPv4アドレス」を確認（例: `192.168.1.100`）

**Mac/Linux:**
```bash
ifconfig
# または
ip addr
```
IPアドレスを確認（例: `192.168.1.100`）

### 3. スマホでフロントエンドにアクセス

スマートフォンのブラウザで以下のいずれかにアクセス：
- 本番環境: `http://[PCのIP]:8000/app`
- 開発環境: `http://[PCのIP]:5173`（開発サーバー起動時）

### 4. 同期先URLとAPIキーの設定

#### 方法1: QRコードで自動設定（推奨）

1. PCのブラウザで `http://[PCのIP]:8000/sync/page` にアクセス
2. 表示されたQRコードをスマホのカメラで読み取る
3. 自動的にAPI URLとAPIキーが設定されます

**QRコードの仕組み**:
- QRコードには、`sync_url` パラメータが含まれています（`https://household-app.vercel.app/sync-setup?sync_url={URL}` 形式）
- `sync_url` には `http://[PCのIP]:8000/sync/url` が含まれています（URLエンコード済み）
- スマホでQRコードを読み取ると、アプリが自動的に `sync_url` パラメータをデコードしてそのURLにアクセスし、`base_url` と `api_key` を取得して設定します

#### 方法2: 手動設定

1. 同期先URLに `http://[PCのIP]:8000` を入力
2. APIキーはQRコードから取得するか、サーバー側の `API_KEY` 環境変数を確認してください（デフォルト: `household-app-secret-key-2024`）

**APIキーの確認方法**:
- サーバー側の `docker-compose.yml` の `API_KEY` 環境変数を確認
- または、`http://[PCのIP]:8000/sync/url` にアクセスしてJSONレスポンスを確認

## 環境変数設定

`server/docker-compose.yml` で以下の環境変数を設定できます：

### API_KEY

APIキー（デフォルト: `household-app-secret-key-2024`）

```yaml
environment:
  API_KEY: "your-secret-key-here"
```

**注意**: APIキーを変更した場合は、クライアント側でも同じキーを設定する必要があります。QRコードを再読み取りするか、手動で設定してください。

### CORS_ORIGINS

CORS許可オリジン（カンマ区切り）

```yaml
environment:
  CORS_ORIGINS: "http://localhost:5173,http://192.168.1.100:8000"
```

### HOST_IP

PCのIPアドレス（QRコード生成時に使用、**推奨**）

```yaml
environment:
  HOST_IP: "192.168.1.100"
```

**重要**: Dockerコンテナ内では自動取得したIPアドレスが内部IP（172.17.x.xなど）になる可能性があります。`HOST_IP`を明示的に設定することを強く推奨します。

### DATABASE_URL

データベース接続URL（通常は変更不要）

```yaml
environment:
  DATABASE_URL: "postgresql+psycopg://household:household@db:5432/household"
```

環境変数を変更した場合は、コンテナを再起動してください：

```bash
cd server
docker compose restart api
```

## 動作確認

### サーバーの状態確認

```bash
cd server
docker compose ps
```

すべてのコンテナが `Up` 状態であることを確認してください。

### ヘルスチェック

ブラウザまたはcurlで以下にアクセス：

```bash
curl http://localhost:8000/health
```

`{"status":"ok"}` が返れば正常です。

### フロントエンドの確認

スマートフォンで以下にアクセスし、アプリが表示されることを確認：

```
http://[PCのIP]:8000/app
```

## トラブルシューティング

### サーバーが起動しない

```bash
# ログを確認
cd server
docker compose logs -f api

# コンテナを再起動
docker compose restart api
```

### スマホからサーバーに接続できない

1. PCとスマホが同じネットワークに接続されているか確認
2. PCのファイアウォールでポート8000が開放されているか確認
3. PCのIPアドレスが正しいか確認（`ipconfig` または `ifconfig` で再確認）

### QRコードが読み取れない

1. PCのブラウザで `http://[PCのIP]:8000/sync/page` にアクセスできるか確認
2. 手動でURLとAPIキーを設定する方法を試す

### APIキーエラーが発生する

1. サーバー側の `API_KEY` 環境変数を確認
2. クライアント側のAPIキー設定を確認
3. QRコードを再読み取りして設定を更新

