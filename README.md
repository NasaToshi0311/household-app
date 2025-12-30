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
# backend
cd server
docker compose up -d

# frontend
cd client
npm install
npm run dev

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
