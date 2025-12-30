# Household App

スマホ入力＋PC集計ができる家計簿アプリ。

## 概要
- スマホから支出を入力
- IndexedDBに一時保存
- PC上のFastAPIへ同期
- PostgreSQLに保存
- 期間指定で集計・カテゴリ別表示

## 技術構成
- Frontend: React + Vite
- Backend: FastAPI
- DB: PostgreSQL
- Container: Docker / docker-compose

## 主な機能
- 支出入力（スマホ）
- 未送信データのローカル保存
- 同期処理
- 期間指定集計
- カテゴリ別集計
- 明細一覧表示

## 起動方法（開発）
```bash
# １．Docker、サーバー系
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

# ２．DB操作・確認
# DBに入る（psql）
cd server
docker compose exec db psql -U household -d household
# テーブル一覧
\dt
# テーブル構造
\d expenses
# データ確認
SELECT * FROM expenses ORDER BY date DESC LIMIT 10;

# ３．フロントエンド
# 開発サーバー起動
cd client
npm run dev
#パッケージ追加後
npm install

# ４．バックアップ
# DBバックアップ作成
cd server
docker compose exec -T db pg_dump -U household household > expenses_YYYY-MM-DD.sql
# 復元(戻したいファイル名を記載)
docker compose exec -T db psql -U household -d household < expenses_YYYY-MM-DD.sql

# ５．Git
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

## ディレクトリ構成
household-app/
├─ client/        # スマホ用フロントエンド（React）
├─ server/        # FastAPI + PostgreSQL（Docker）
├─ docs/          # 設計メモなど
└─ README.md

## 使い方
1. スマホでフロントエンドにアクセス
2. 支出を入力（オフライン可）
3. 「同期する」を押してPCのAPIに送信
4. PC側で集計画面を確認

## 注意点
- PCとスマホは同一ネットワーク（テザリング可）で接続する
- 初回はAPIのURLを入力して保存する
- DBデータはローカル環境のため、定期的にバックアップを取る

## DBバックアップ
PostgreSQLのバックアップは OneDrive に保存する。

```powershell
cd server
docker compose exec -T db pg_dump -U household household > expenses_YYYY-MM-DD.sql
