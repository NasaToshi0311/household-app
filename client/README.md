# Household App - クライアント（フロントエンド）

スマートフォン向けのPWA（Progressive Web App）として実装された家計簿アプリのフロントエンドです。

## 概要

- React + TypeScript + Vite で構築
- PWA対応（オフライン入力可能）
- IndexedDBによるローカルデータ保存
- サーバー（FastAPI）への同期機能

## 技術スタック

- **フレームワーク**: React 19.2.0
- **ビルドツール**: Vite 7.2.4
- **言語**: TypeScript 5.9.3
- **PWA**: vite-plugin-pwa 1.2.0
- **ローカルストレージ**: IndexedDB (idb 8.0.3)
- **UUID生成**: uuid 13.0.0

## 開発環境のセットアップ

### 前提条件

- Node.js（npm）がインストールされていること
- サーバー（FastAPI）が起動していること

### インストール

```bash
cd client
npm install
```

### 開発サーバーの起動

```bash
npm run dev
```

開発サーバーは `http://localhost:5173` で起動します。

### ビルド

```bash
npm run build
```

ビルド結果は `dist/` ディレクトリに出力されます。本番環境ではVercelが`master`へのpushを検知して自動的にビルド・デプロイするため、通常は手動ビルドは不要です（`https://household-app.vercel.app`）。

### プレビュー

```bash
npm run preview
```

ビルド結果をローカルでプレビューできます。

## ディレクトリ構成

```
client/
├── src/
│   ├── api/          # API通信関連
│   ├── components/    # Reactコンポーネント
│   ├── config/       # 設定（API URL、APIキー）
│   ├── constants/    # 定数定義
│   ├── db.ts         # IndexedDB操作
│   ├── hooks/        # カスタムフック
│   ├── pages/        # ページコンポーネント
│   ├── ui/           # UIスタイル
│   ├── App.tsx       # メインアプリケーション
│   └── main.tsx      # エントリーポイント
├── public/           # 静的ファイル
└── dist/             # ビルド出力（gitignore）
```

## 主な機能

### 支出入力

- 日付、金額、カテゴリ、メモ、支払者を入力
- 入力データは即座にIndexedDBに保存（`status="pending"`）
- オフラインでも入力可能

### 同期機能

- 未送信データ（`status="pending"`）をサーバーに送信
- 同期成功したデータは`status="synced"`に更新
- 同期失敗時もデータは保持され、次回再試行可能

### 集計機能

- 期間指定でローカルデータから集計
- 合計金額、カテゴリ別集計、支払者別集計を表示
- 明細一覧表示（最大50件）

### 同期（差分同期）

- 未送信データを`POST /sync/expenses`で送信後、`GET /sync/changes?since=...`で前回同期以降の差分（他端末での追加・編集・削除）を取得してIndexedDBに反映
- 初回・全件再取得時は`since`なしで全期間のデータを取得
- サーバー側で論理削除されたデータも`deleted: true`で返るため、他端末での削除もこのスマホに反映される

### QRコード設定

- QRコードを読み取ってAPI URLとAPIキーを自動設定
  - QRコードはPC本体・家のLANから `http://[PCのIP]:8000/sync/page` で表示（外部からは開けない）
  - QRコードには `base_url` と `api_key` パラメータが直接含まれる（`https://household-app.vercel.app/#base_url={URL}&api_key={KEY}` 形式、URLエンコード済み）
  - `#`（フラグメント）に入れているのは、APIキーをVercelのアクセスログに残さないため
  - `base_url` と `api_key` パラメータをデコードして自動的にlocalStorageに保存される
  - 旧形式の `?base_url=...` にも対応
  - 一度のスキャンで全ての情報を取得できるため、追加のネットワークリクエストは不要
- 手動入力も可能（API URLのみ、APIキーはQRコードから取得推奨）

## IndexedDB構造

### expensesストア（メイン）

- **キー**: `client_uuid` (Primary Key)
- **インデックス**: 
  - `by-status` (statusフィールドで検索可能)
  - `by-date` (dateフィールドで範囲検索可能、v3で追加)
- **データ型**: `Expense`

```typescript
type Expense = {
  client_uuid: string;
  date: string;              // ISO形式 (YYYY-MM-DD)
  amount: number;
  category: string;
  note?: string;
  paid_by: "me" | "her";
  op: "upsert" | "delete";
  status: "pending" | "synced";
  updated_at: string;        // ISO形式の日時文字列
};
```

### pendingストア（後方互換性）

- 旧実装との互換性のため残存
- 現在は使用されていない（自動的にexpensesストアに移行）

### metaストア

- マイグレーション状態の永続化用

## 本番環境への反映

`master`にpushすると、Vercelが自動的にビルド・デプロイします。スマホは次回起動時に自動更新されます。手動でのビルド・コピー作業は不要です。

## 注意点

- 開発環境では `http://localhost:5173` で起動しますが、本番環境では `https://household-app.vercel.app`（Vercel）で配信されます
- PWAとしてホーム画面に追加すると、オフラインでも入力可能です
- 同期はオンライン時のみ実行可能です
- API URLとAPIキーはローカルストレージ（localStorage）に保存されます
  - API URL: `household_api_base_url` キー
  - APIキー: `household_api_key` キー
- 同期リクエストには `X-API-Key` ヘッダーが自動的に付与されます
- タイムアウトは15秒に設定されています（モバイル回線での遅延を考慮）
