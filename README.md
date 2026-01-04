# Household App

スマホ入力＋PC集計ができる家計簿アプリ。
※ 本アプリは「PCをサーバーとして、スマホから家計入力する」個人利用向けアプリです。

## 概要

- スマホから支出を入力
- IndexedDBに一時保存
- PC上のFastAPIへ同期
- PostgreSQLに保存
- 期間指定で集計・カテゴリ別表示

### 利用イメージ

- **PC**：FastAPI + PostgreSQL を起動（集計・保存担当）
- **スマホ**：PWAで支出入力（オフライン可）

## 主な機能

- 支出入力（スマホ）
- 未送信データのローカル保存（IndexedDB）
- オフライン対応（PWA）
- 同期処理
- QRコードによるAPI URL・APIキー自動設定
- APIキー認証（セキュリティ対策）
- 期間指定集計
- カテゴリ別集計
- 明細一覧表示
- 明細削除（論理削除）

## 技術構成

- **Frontend**: React + Vite + TypeScript
- **PWA**: vite-plugin-pwa（オフライン対応）
- **Backend**: FastAPI
- **DB**: PostgreSQL
- **Container**: Docker / docker-compose

## ディレクトリ構成

```
household-app/
├─ client/        # スマホ用フロントエンド（React）
├─ server/        # FastAPI + PostgreSQL（Docker）
├─ docs/          # 設計メモなど
└─ README.md
```

## 使い方
### 前提条件

- PCに Docker / Docker Compose がインストールされていること
- Node.js（npm）がインストールされていること
- PCとスマホが同一ネットワークに接続されていること

### 初回セットアップ

1. サーバーを起動（`cd server && docker compose up -d`）
2. PCのIPアドレスを確認（例: `192.168.1.100`）
3. スマホでフロントエンドにアクセス
4. 同期先URLとAPIキーを設定：
   - **推奨**: QRコードで自動設定（`http://[PCのIP]:8000/sync/page` にアクセスしてQRコードを読み取る）
   - **手動**: URLに `http://[PCのIP]:8000` を入力し、APIキーを設定（デフォルト: `household-app-secret-key-2024`）

### 日常的な使い方

1. スマホでフロントエンドにアクセス（PWAとしてホーム画面に追加可能）
2. 「入力」タブで支出を入力（オフライン可）
3. 「同期する」ボタンを押してPCのAPIに送信
4. 「集計」タブで期間を指定して集計・明細を確認

### QRコードでURL・APIキー設定（推奨）

PCのブラウザで `http://[PCのIP]:8000/sync/page` にアクセスし、表示されたQRコードをスマホのカメラで読み取ると、自動的にAPI URLとAPIキーが設定されます。手動入力よりも簡単で確実です。

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

### データベース操作

```bash
# DBに入る（psql）
cd server
docker compose exec db psql -U household -d household

# テーブル一覧
\dt

# テーブル構造
\d expenses

# データ確認
SELECT * FROM expenses ORDER BY date DESC LIMIT 10;
```

### フロントエンド開発

```bash
# 開発サーバー起動
cd client
npm run dev

# パッケージ追加後
npm install

# 本番ビルド（PWA対応）
npm run build

# ビルド結果のプレビュー
npm run preview
```

### データベースバックアップ

#### 手動バックアップ

```bash
# DBバックアップ作成
cd server
docker compose exec -T db pg_dump -U household household > expenses_YYYY-MM-DD.sql

# 復元（戻したいファイル名を記載）
docker compose exec -T db psql -U household -d household < expenses_YYYY-MM-DD.sql
```

#### 自動バックアップ（PowerShellスクリプト）

`server/backup_db.ps1` を実行すると、以下の処理が行われます：

- OneDriveの `household-app-backup/db` ディレクトリにバックアップを保存
- 30日より古いSQLファイルを自動削除
- ファイル名は `expenses_YYYY-MM-DD.sql` 形式

```powershell
cd server
.\backup_db.ps1
```

**注意**: バックアップは OneDrive に自動保存されます。定期的に実行することを推奨します。

### Git操作

```bash
# 変更確認
git status

# 差分確認（qで終了）
git diff

# 変更を保存
git add .
git commit -m "message"

# GitHubに反映
git push
```

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

## 環境変数設定

`server/docker-compose.yml` で以下の環境変数を設定できます：

- `API_KEY`: APIキー（デフォルト: `household-app-secret-key-2024`）
- `CORS_ORIGINS`: CORS許可オリジン（カンマ区切り）
- `HOST_IP`: PCのIPアドレス（QRコード生成時に使用）

例：
```yaml
environment:
  API_KEY: "your-secret-key-here"
  CORS_ORIGINS: "http://localhost:5173,http://192.168.1.100:8000"
  HOST_IP: "192.168.1.100"
```

## 注意点

- PCとスマホは同一ネットワーク（テザリング可）で接続する必要があります
- 初回はAPIのURLとAPIキーを設定してください（QRコード推奨）
- APIキー認証により、同一ネットワーク内でも不正アクセスを防止しています
- DBデータはローカル環境のため、定期的にバックアップを取ることを推奨します（`backup_db.ps1` を使用）
- PWAとしてホーム画面に追加すると、オフラインでも入力可能です
- 同期はオンライン時のみ実行可能です

## セキュリティ

- **APIキー認証**: すべてのAPIリクエストにAPIキーが必要です（`X-API-Key` ヘッダー）
- **CORS設定**: 許可されたオリジンのみアクセス可能
- **認証不要パス**: `/health`, `/docs`, `/sync/page`, `/sync/qr.png`, `/sync/url`, `/app` は認証不要

## ライセンス・注意

- 本アプリは個人利用を想定しています
- APIキー認証により基本的なセキュリティ対策を実装していますが、HTTPS未対応です
- 外部公開や商用利用には追加対策（HTTPS、より強固な認証等）が必要です
