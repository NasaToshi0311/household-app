# Household App

スマホ入力＋PC集計ができる家計簿アプリ。
※ 本アプリは「PCをサーバーとして、スマホから家計入力する」個人利用向けアプリです。

## 概要

- スマホから支出を入力
- IndexedDBに一時保存
- PC上のFastAPIへ同期
- PostgreSQLに保存
- 期間指定で集計・カテゴリ別表示

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

## 使い方

### 日常的な使い方

1. スマホでフロントエンドにアクセス（PWAとしてホーム画面に追加可能）
2. 「入力」タブで支出を入力（オフライン可）
3. 「同期する」ボタンを押してPCのAPIに送信
4. 「集計」タブで期間を指定して集計・明細を確認

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

- PCとスマホは同一ネットワーク（テザリング可）で接続する必要があります
- 初回はAPIのURLとAPIキーを設定してください（QRコード推奨）
  - QRコードは `http://[PCのIP]:8000/sync/page` で表示できます
  - QRコードを読み取ると、自動的にAPI URLとAPIキーが設定されます
  - QRコードには `sync_url` パラメータが含まれており、そこからAPI URLとAPIキーを取得します
- APIキー認証により、同一ネットワーク内でも不正アクセスを防止しています
- DBデータはローカル環境のため、定期的にバックアップを取ることを推奨します（`backup_db.ps1` を使用）
- PWAとしてホーム画面に追加すると、オフラインでも入力可能です
- 同期はオンライン時のみ実行可能です
- サーバー側の環境変数設定（`docker-compose.yml`）:
  - `API_KEY`: APIキー（デフォルト: `household-app-secret-key-2024`）
  - `HOST_IP`: PCのIPアドレス（QRコード生成時に使用、推奨）
  - `CORS_ORIGINS`: CORS許可オリジン（カンマ区切り）

## セキュリティ

- **APIキー認証**: すべてのAPIリクエストにAPIキーが必要です（`X-API-Key` ヘッダー）
  - デフォルトのAPIキー: `household-app-secret-key-2024`
  - 環境変数 `API_KEY` で変更可能
  - 認証不要なパス: `/health`, `/docs`, `/sync/page`, `/sync/qr.png`, `/sync/url`, `/app`
- **CORS設定**: 許可されたオリジンのみアクセス可能（環境変数 `CORS_ORIGINS` で設定、カンマ区切り）
  - デフォルト値（未設定時）: `https://household-app.vercel.app`, `http://localhost:5173` など

詳細は `docs/architecture.md` を参照してください。

## ライセンス・注意

- 本アプリは個人利用を想定しています
- APIキー認証により基本的なセキュリティ対策を実装していますが、HTTPS未対応です
- 外部公開や商用利用には追加対策（HTTPS、より強固な認証等）が必要です
