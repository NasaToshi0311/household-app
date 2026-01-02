# Household App アーキテクチャ

## 概要

Household Appは、スマートフォンから支出を入力し、PC上のサーバーに同期して集計・分析を行う家計簿アプリケーションです。オフライン対応のPWAとして実装されており、ネットワーク接続がなくても入力が可能です。

## システムアーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                     スマートフォン（クライアント）              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  React + Vite + TypeScript (PWA)                     │  │
│  │  ┌──────────────┐  ┌──────────────┐                │  │
│  │  │  ExpenseForm │  │  SummaryPage │                │  │
│  │  │  (入力画面)   │  │  (集計画面)   │                │  │
│  │  └──────┬───────┘  └──────┬───────┘                │  │
│  │         │                  │                          │  │
│  │  ┌──────▼──────────────────▼──────┐                 │  │
│  │  │  IndexedDB (idb)               │                 │  │
│  │  │  - pending (未送信データ)       │                 │  │
│  │  └──────┬─────────────────────────┘                 │  │
│  │         │                                            │  │
│  │  ┌──────▼──────────┐                                │  │
│  │  │  API Client     │                                │  │
│  │  │  - syncExpenses │                                │  │
│  │  └──────┬──────────┘                                │  │
│  └─────────┼──────────────────────────────────────────┘  │
└────────────┼──────────────────────────────────────────────┘
             │ HTTP (同一ネットワーク)
             │
┌────────────▼──────────────────────────────────────────────┐
│                    PC（サーバー）                           │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  FastAPI (Python)                                     │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │ │
│  │  │ /sync    │  │ /summary │  │ /expenses│            │ │
│  │  │ /stats   │  │ /sync/qr │  │          │            │ │
│  │  └────┬────┘  └────┬─────┘  └────┬─────┘            │ │
│  │       │             │              │                  │ │
│  │  ┌────▼─────────────▼──────────────▼────┐           │ │
│  │  │  SQLAlchemy ORM                      │           │ │
│  │  └────┬─────────────────────────────────┘           │ │
│  └───────┼─────────────────────────────────────────────┘ │
│          │                                                │
│  ┌───────▼─────────────────────────────────────────────┐ │
│  │  PostgreSQL (Docker)                                 │ │
│  │  ┌──────────────────────────────────────────────┐   │ │
│  │  │  expenses テーブル                              │   │ │
│  │  │  - id, client_uuid, date, amount, category   │   │ │
│  │  │  - note, paid_by, created_at, updated_at     │   │ │
│  │  │  - deleted_at (論理削除)                      │   │ │
│  │  └──────────────────────────────────────────────┘   │ │
│  └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

## 技術スタック

### フロントエンド

- **フレームワーク**: React 19.2.0
- **ビルドツール**: Vite 7.2.4
- **言語**: TypeScript 5.9.3
- **PWA**: vite-plugin-pwa 1.2.0
- **ローカルストレージ**: IndexedDB (idb 8.0.3)
- **UUID生成**: uuid 13.0.0

### バックエンド

- **フレームワーク**: FastAPI 0.115.6
- **言語**: Python 3.x
- **ORM**: SQLAlchemy 2.0.36
- **データベースドライバ**: psycopg[binary] 3.2.3
- **バリデーション**: Pydantic 2.10.2
- **QRコード生成**: qrcode 8.0

### インフラストラクチャ

- **コンテナ**: Docker / docker-compose
- **データベース**: PostgreSQL 16
- **Webサーバー**: Uvicorn 0.32.1

## データモデル

### クライアント側（IndexedDB）

```typescript
type PendingExpense = {
  client_uuid: string;      // UUID v4 (36文字)
  date: string;              // ISO形式 (YYYY-MM-DD)
  amount: number;            // 金額（整数）
  category: string;          // カテゴリ（最大32文字）
  note?: string;             // メモ（最大200文字、任意）
  paid_by: "me" | "her";    // 支払者
  op: "upsert" | "delete";   // 操作種別
};
```

**ストレージ構造**:
- ObjectStore名: `pending`
- キー: `client_uuid` (Primary Key)

### サーバー側（PostgreSQL）

```python
class Expense:
    id: int                    # Primary Key (Auto Increment)
    client_uuid: str           # Unique Index (36文字)
    date: date                 # 日付
    amount: int                # 金額
    category: str              # カテゴリ（最大32文字）
    note: str | None           # メモ（最大200文字、任意）
    paid_by: str               # 支払者（最大8文字）
    created_at: datetime       # 作成日時（UTC）
    updated_at: datetime       # 更新日時（UTC）
    deleted_at: datetime | None # 削除日時（論理削除、UTC）
```

**インデックス**:
- `client_uuid`: Unique Index（重複防止・高速検索）

## データフロー

### 1. 支出入力フロー

```
ユーザー入力
    ↓
ExpenseForm コンポーネント
    ↓
バリデーション（金額、カテゴリ、メモ長さ）
    ↓
addPending() → IndexedDB に保存
    ↓
画面更新（未送信リストに表示）
```

### 2. 同期フロー

```
同期ボタンクリック
    ↓
getAllPending() → IndexedDB から全件取得
    ↓
syncExpenses() → POST /sync/expenses
    ↓
サーバー側処理:
  - バリデーション（件数制限、データ形式）
  - トランザクション開始
  - 各アイテムを UPSERT（client_uuid で重複判定）
  - 成功/失敗を記録
  - コミット or ロールバック
    ↓
レスポンス: { ok_uuids: [], ng_uuids: [] }
    ↓
removePending(ok_uuids) → 成功したアイテムを削除
    ↓
画面更新
```

### 3. 集計フロー

```
集計タブ選択
    ↓
SummaryPage コンポーネント
    ↓
期間指定（開始日・終了日）
    ↓
並列リクエスト:
  - GET /summary?start=...&end=...
  - GET /summary/by-category?start=...&end=...
  - GET /summary/expenses?start=...&end=...&limit=50&offset=0
    ↓
結果を画面に表示
```

## API設計

### エンドポイント一覧

#### 同期関連

- `POST /sync/expenses`
  - 支出データの一括同期
  - リクエスト: `{ items: SyncExpenseItem[] }`
  - レスポンス: `{ ok_uuids: string[], ng_uuids: string[] }`
  - 最大件数: 1000件

- `GET /sync/url`
  - 同期用URL取得（QRコード用）
  - レスポンス: `{ base_url: string }`

- `GET /sync/qr.png`
  - QRコード画像生成

- `GET /sync/page`
  - QRコード表示用HTMLページ

#### 集計関連

- `GET /summary?start={date}&end={date}`
  - 期間指定の合計金額取得
  - レスポンス: `{ start: date, end: date, total: int }`

- `GET /summary/by-category?start={date}&end={date}`
  - カテゴリ別集計
  - レスポンス: `[{ category: string, total: int }, ...]`

- `GET /summary/expenses?start={date}&end={date}&limit={int}&offset={int}`
  - 明細一覧取得
  - レスポンス: `[{ id, date, amount, category, note, paid_by }, ...]`

#### 支出管理

- `GET /expenses?month={YYYY-MM}`
  - 月別支出一覧

- `DELETE /expenses/{id}`
  - 明細の論理削除

#### 統計

- `GET /stats?month={YYYY-MM}`
  - 月別統計（合計、カテゴリ別、支払者別）

#### ヘルスチェック

- `GET /health`
  - サーバー状態確認
  - レスポンス: `{ status: "ok" }`

## 同期メカニズム

### 重複防止

- `client_uuid`を一意キーとして使用
- PostgreSQLの`ON CONFLICT DO UPDATE`でUPSERT実現
- 同じ`client_uuid`で複数回同期しても、最新データで上書き

### エラーハンドリング

1. **個別アイテムエラー**
   - 1つのアイテムが失敗しても、他のアイテムは処理継続
   - 失敗した`client_uuid`は`ng_uuids`に含まれる
   - クライアント側で失敗アイテムはローカルDBに残り、次回再試行

2. **トランザクションエラー**
   - 致命的なエラー（DB接続エラーなど）が発生した場合、全体をロールバック
   - HTTP 500エラーを返す

3. **ネットワークエラー**
   - タイムアウト: 8秒（同期）、10秒（集計）
   - エラー時はアラート表示、データはローカルに保持

### オフライン対応

- 入力データは即座にIndexedDBに保存
- ネットワーク接続時のみ同期可能
- 同期失敗時もデータは保持され、次回再試行

## セキュリティ考慮事項

### 現在の実装

1. **CORS設定**
   - 環境変数`CORS_ORIGINS`で許可オリジンを指定
   - デフォルトは開発環境用のローカルホスト

2. **DoS対策**
   - 同期リクエストの最大件数制限（1000件）

3. **データバリデーション**
   - Pydanticスキーマで厳密な型チェック
   - 金額範囲: 0〜10億円
   - 文字列長制限

### 改善の余地

1. **認証・認可**
   - 現在は認証なし（同一ネットワーク内での使用を想定）
   - 本番環境では認証機構の追加を推奨

2. **HTTPS**
   - 現在はHTTP（ローカルネットワーク想定）
   - 外部公開時はHTTPS必須

3. **レート制限**
   - API呼び出し頻度の制限を検討

## パフォーマンス最適化

### クライアント側

- IndexedDBによる高速なローカルストレージアクセス
- PWAによるキャッシュ機能
- 並列リクエスト（集計画面の3つのAPI）

### サーバー側

- PostgreSQLのインデックス活用（`client_uuid`）
- 接続プーリング（SQLAlchemy）
- 論理削除による物理削除の回避

## デプロイメント

### 開発環境

```bash
# サーバー起動
cd server
docker compose up -d

# クライアント起動
cd client
npm run dev
```

### 本番環境

- クライアント: `npm run build`でビルド後、静的ファイルを配信
- サーバー: Dockerコンテナとして実行
- データベース: PostgreSQL（Dockerボリュームで永続化）

## 今後の拡張可能性

1. **認証機能**
   - JWT認証の追加
   - ユーザー管理機能

2. **データ分析**
   - グラフ表示
   - 予算管理機能
   - レポート生成

3. **マルチデバイス対応**
   - 複数スマートフォンからの同期
   - データ競合解決

4. **バックアップ機能**
   - 自動バックアップ
   - クラウドストレージ連携

