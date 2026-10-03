# セットアップガイド

Household Appのセットアップ手順を説明します。

## 前提条件

- PCに Docker / Docker Compose がインストールされていること
- Node.js（npm）がインストールされていること（フロントエンドをローカルで動かす場合）
- Tailscaleアカウント（外部公開する場合。詳細は [architecture.md](architecture.md) 参照）

## 初回セットアップ

### 1. `server/.env` の作成

`server/.env` にAPIキー等を設定します。このファイルはGitに含めません（`.gitignore`済み）。

```env
API_KEY=ランダムで長い文字列（32文字以上を推奨）
PUBLIC_BASE_URL=https://pc2023.tail5d0b68.ts.net
```

- `API_KEY`: 必須。未設定だとコンテナが起動しません（`docker-compose.yml` が `API_KEY` 必須の設定になっています）。
  - 生成例（PowerShell）: `-join ((48..57)+(65..90)+(97..122)|Get-Random -Count 40|%{[char]$_})`
- `PUBLIC_BASE_URL`: Tailscale Funnelなど、外部（スマホのモバイル回線など）からアクセスできるhttpsのURL。QRコードの同期先として使われます。未設定の場合は `http://[PCのIP]:8000`（LAN内のみ）になります。

### 2. サーバーの起動

```bash
cd server
docker compose up -d
```

サーバーが起動すると、以下のサービスが利用可能になります：
- FastAPI: `http://localhost:8000`
- PostgreSQL: `127.0.0.1:5432`（PC内からのみ接続可能）

### 3. （外部公開する場合）Tailscale Funnelの設定

スマホから同一ネットワーク外（モバイル回線等）でも同期したい場合は、PCにTailscaleを入れて以下を実行します。

```bash
tailscale funnel --bg 8000
```

- 状態確認: `tailscale funnel status`
- 停止: `tailscale funnel --https=443 off`
- 公開されたURL（例: `https://pc2023.tail5d0b68.ts.net`）を `server/.env` の `PUBLIC_BASE_URL` に設定してください。
- 公開URLは証明書の公開ログに載るため秘密情報ではありません。データの保護はAPIキーで行っています。

### 4. 同期先URLとAPIキーの設定（QRコード）

1. **PC本体のブラウザ**（または家のLAN内の端末）で `http://localhost:8000/sync/page` にアクセス
   - このページは外部（Tailscale Funnel経由など）からは開けません（LAN限定）
2. 表示されたQRコードをスマホのカメラで読み取る
3. 自動的にAPI URLとAPIキーがスマホ側に設定されます

**QRコードの仕組み**:
- QRコードのURLは `https://household-app.vercel.app/#base_url={URL}&api_key={KEY}` 形式です
- `base_url` には手順3で設定した公開URL（またはLANのIP）が、`api_key` には `server/.env` のAPIキーが入ります
- `#`（フラグメント）に入れているのは、APIキーをVercelのアクセスログに残さないためです
- クライアントは旧形式の `?base_url=...` にも対応しています

### 5. スマホでフロントエンドにアクセス

スマートフォンのブラウザで `https://household-app.vercel.app` にアクセスします（手順4のQRコードを読み取ればURL設定は自動で完了します）。PWAとしてホーム画面に追加しておくと便利です。

## 環境変数設定

`server/.env` で以下の環境変数を設定できます：

| 変数名 | 必須 | 説明 |
|---|---|---|
| `API_KEY` | 必須 | APIキー。クライアント側の認証に使う |
| `PUBLIC_BASE_URL` | 任意 | QRコードに入る同期先URL（Tailscale Funnelのhttps URLなど）。未設定時は `http://HOST_IP:8000` |

`server/docker-compose.yml` にも以下の環境変数があります（通常は変更不要）：

- `CORS_ORIGINS`: CORS許可オリジン（カンマ区切り、デフォルト: `https://household-app.vercel.app,http://localhost:5173`）
- `HOST_IP`: PCのLAN内IPアドレス（`PUBLIC_BASE_URL`未設定時のQRコード生成に使用）
- `ALLOW_SUBNETS`: LAN限定ページ（`/sync/page`等）を許可するサブネット（カンマ区切り）

環境変数を変更した場合は、コンテナを再作成してください：

```bash
cd server
docker compose up -d --force-recreate api
```

## データベースの自動バックアップ

毎日決まった時刻にDBをバックアップするよう設定できます。

```powershell
cd server
.\register_backup_task.ps1
```

Windowsのタスクスケジューラに登録され、PCが起動していればDBをバックアップします（PCをこのために自動起動する設定は行いません）。詳細は [OPERATIONS.md](OPERATIONS.md) を参照してください。

## 動作確認

### サーバーの状態確認

```bash
cd server
docker compose ps
```

すべてのコンテナが `Up` 状態であることを確認してください。

### ヘルスチェック

```bash
curl http://localhost:8000/health
```

`{"status":"ok"}` が返れば正常です。

### フロントエンドの確認

スマートフォンで `https://household-app.vercel.app` にアクセスし、アプリが表示されることを確認します。

## トラブルシューティング

### サーバーが起動しない

```bash
# ログを確認
cd server
docker compose logs -f api

# server/.env に API_KEY が設定されているか確認（未設定だと起動しない）
```

### スマホからサーバーに接続できない

1. Tailscale Funnelが有効か確認: `tailscale funnel status`
2. `server/.env` の `PUBLIC_BASE_URL` が正しいか確認
3. QRコードを再読み取りして設定を更新

### QRコードが読み取れない

1. PC本体かLAN内の端末のブラウザで `http://localhost:8000/sync/page` にアクセスできるか確認
   - 外部（Tailscale Funnel経由）からはアクセスできない仕様です
2. 手動でURLとAPIキーを設定する方法を試す

### APIキーエラーが発生する

1. `server/.env` の `API_KEY` を確認
2. クライアント側のAPIキー設定を確認
3. QRコードを再読み取りして設定を更新

詳細は `docs/TROUBLESHOOTING.md` を参照してください。
