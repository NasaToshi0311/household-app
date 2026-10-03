# Household App

スマホ入力＋PC集計ができる家計簿アプリ。
※ 本アプリは「PCをサーバーとして、スマホから家計入力する」個人利用向けアプリです。

## 概要

- スマホ（PWA、Vercelでホスティング）から支出を入力
- IndexedDBに全期間のデータを保持（オフラインでも入力・集計可能）
- Tailscale Funnel経由のhttpsで、PC上のFastAPIへ同期
- PostgreSQLに保存
- 期間指定で集計・カテゴリ別表示

## 構成

```
スマホ（PWA: https://household-app.vercel.app）
   │ https
   ▼
Tailscale Funnel（https://pc2023.tail5d0b68.ts.net）
   │
   ▼
PCの Docker: household-api (FastAPI :8000) + household-db (PostgreSQL)
```

- 同期先をhttpsにしているのは、iPhone（Safari / WebKit）がhttpsのページからhttpの通信をブロックするため（mixed content）。
- 詳細は [CLAUDE.md](CLAUDE.md) を参照してください。

## 主な機能

- 支出入力（スマホ）
  - 金額は整数のみ入力可能（小数点不可）
  - 入力値の検証機能（金額、日付、メモの文字数制限など）
- IndexedDBへの全期間データ保持、オフライン対応（PWA）
- 差分同期処理（未送信データの送信＋他端末での変更・削除の反映）
- QRコードによるAPI URL・APIキー自動設定
- APIキー認証（セキュリティ対策）
- 期間指定集計・カテゴリ別集計・明細一覧表示
- 明細削除（論理削除）

## 技術構成

- **Frontend**: React + Vite + TypeScript
- **PWA**: vite-plugin-pwa（オフライン対応）
- **Backend**: FastAPI
- **DB**: PostgreSQL
- **Container**: Docker / docker-compose
- **外部公開**: Tailscale Funnel（https）

## 使い方

### 日常的な使い方

1. スマホでフロントエンドにアクセス（PWAとしてホーム画面に追加可能）
2. 「入力」タブで支出を入力（オフライン可）
3. 「同期する」ボタンを押してPCのAPIに送信
4. 「集計」タブで期間を指定して集計・明細を確認

### 初回セットアップ

1. PCで `cd server && docker compose up -d`（事前に `server/.env` に `API_KEY` を設定しておく）
2. PCのブラウザで `http://localhost:8000/sync/page` を開き、QRコードを表示
3. スマホのカメラでQRコードを読み取ると、同期先URLとAPIキーが自動設定される

詳細は [docs/SETUP.md](docs/SETUP.md) を参照してください。

## ドキュメント

### 基本ドキュメント

- **[セットアップガイド](docs/SETUP.md)**: 初回セットアップ手順、環境変数設定
- **[運用・保守ガイド](docs/OPERATIONS.md)**: コマンドリファレンス、バックアップ、デプロイメント
- **[アーキテクチャ](docs/architecture.md)**: システム設計、API仕様、データモデル

### 開発者向け

- **[サーバー開発ガイド](server/README.md)**: バックエンド開発ガイド、コード構造、デバッグ方法
- **[クライアント開発](client/README.md)**: フロントエンド開発ガイド

### リファレンス

- **[APIリファレンス](docs/API.md)**: APIエンドポイントの詳細仕様、リクエスト/レスポンス例
- **[データベーススキーマ](docs/DATABASE.md)**: データベース構造、テーブル定義、クエリ例

### トラブルシューティング

- **[トラブルシューティングガイド](docs/TROUBLESHOOTING.md)**: よくある問題と解決方法

### その他

- **[セキュリティポリシー](SECURITY.md)**: セキュリティに関する情報、既知の制限事項

## 注意点

### 使用方法

- PCとスマホはTailscale Funnel経由のhttpsで同期するため、同一ネットワークである必要はない（スマホがモバイル回線でも同期可能）
- 初回はAPIのURLとAPIキーを設定してください（QRコード推奨）
  - QRコードは `/sync/page`（PC本体かLANからのみアクセス可）で表示できます
  - QRコードを読み取ると、自動的にAPI URLとAPIキーが設定されます
  - QRコードのURL形式: `https://household-app.vercel.app/#base_url={URL}&api_key={KEY}`（`#`に入れているのは、APIキーをアクセスログに残さないため）
- 金額は整数のみ入力可能です（小数点は使用できません）
- 日付の入力範囲に制限はありませんが、無効な日付形式はエラーになります

### データ管理

- APIキー認証により、APIキーを知らない第三者からのアクセスを防止しています
- スマホのIndexedDBには全期間のデータが保持され、オフラインでも集計可能です
- DBデータはローカル環境のため、`server/backup_db.ps1` による定期バックアップを設定してください（[docs/OPERATIONS.md](docs/OPERATIONS.md) 参照）
- IndexedDBは自動的にバージョン管理され、スキーマ変更時は自動的にアップグレードされます

### PWA機能

- PWAとしてホーム画面に追加すると、オフラインでも入力可能です
- 同期はオンライン時のみ実行可能です
- localStorageの使用が制限されている環境（プライベートモードなど）では、設定の保存に失敗する可能性があります

## セキュリティ

- **APIキー認証**: すべてのAPIリクエストにAPIキーが必要です（`X-API-Key` ヘッダー）
  - APIキーは `server/.env` の `API_KEY` で管理します（Gitには含めません）
  - 認証不要なパス: `/health`, `/favicon.ico`, `/sync/page`, `/sync/qr.png`, `/sync/url`（いずれもLAN限定、後述）。それ以外（`/sync/expenses`, `/sync/changes` など）はAPIキー認証が必要です
- **CORS設定**: 許可されたオリジンのみアクセス可能（環境変数 `CORS_ORIGINS` で設定、カンマ区切り）
- **LAN限定**: APIキーを発行するページ（`/sync/page`, `/sync/qr.png`, `/sync/url`）と `/docs`, `/openapi.json` は、Tailscale Funnel等のプロキシ経由（外部）からは開けません。家のLAN・PC本体からのみアクセス可能です
- **データベースのポート**: `server/docker-compose.yml` でDBのポートは `127.0.0.1` のみに待受を限定しており、LANの他の機器からは接続できません

詳細は `docs/architecture.md` を参照してください。

## ライセンス・注意

- 本アプリは個人利用を想定しています
- APIキー認証とTailscale Funnelのhttps化により基本的なセキュリティ対策を実装していますが、外部公開や商用利用には追加対策（より強固な認証、監査ログ等）が必要です
