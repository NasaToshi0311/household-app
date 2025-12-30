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
