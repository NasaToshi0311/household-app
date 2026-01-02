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
- QRコードによるAPI URL設定
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
4. 同期先URLに `http://[PCのIP]:8000` を入力して保存

### 日常的な使い方

1. スマホでフロントエンドにアクセス（PWAとしてホーム画面に追加可能）
2. 「入力」タブで支出を入力（オフライン可）
3. 「同期する」ボタンを押してPCのAPIに送信
4. 「集計」タブで期間を指定して集計・明細を確認

### QRコードでURL設定（オプション）

PCのブラウザで `http://[PCのIP]:8000/sync/page` にアクセスし、表示されたQRコードをスマホのカメラで読み取ると、自動的にAPI URLが設定されます。

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

```bash
# DBバックアップ作成
cd server
docker compose exec -T db pg_dump -U household household > expenses_YYYY-MM-DD.sql

# 復元（戻したいファイル名を記載）
docker compose exec -T db psql -U household -d household < expenses_YYYY-MM-DD.sql
```

**注意**: PostgreSQLのバックアップは OneDrive に保存する。

```powershell
cd server
docker compose exec -T db pg_dump -U household household > expenses_YYYY-MM-DD.sql
```

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


## 注意点

- PCとスマホは同一ネットワーク（テザリング可）で接続する必要があります
- 初回はAPIのURLを入力して保存するか、QRコードで設定してください
- DBデータはローカル環境のため、定期的にバックアップを取ることを推奨します
- PWAとしてホーム画面に追加すると、オフラインでも入力可能です
- 同期はオンライン時のみ実行可能です

## ライセンス・注意

- 本アプリは個人利用を想定しています
- セキュリティ対策（認証・HTTPS等）は最低限です
- 外部公開や商用利用には追加対策が必要です
