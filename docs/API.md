# APIリファレンス

Household AppのAPIエンドポイントの詳細な仕様です。

## ベースURL

- 開発環境: `http://localhost:8000`
- 本番環境: `http://[PCのIP]:8000`

## 認証

すべてのAPIリクエスト（認証不要なパスを除く）には、`X-API-Key`ヘッダーが必要です。

```http
X-API-Key: household-app-secret-key-2024
```

### 認証不要なパス

以下のパスは認証不要です：

- `GET /health`
- `GET /docs`
- `GET /openapi.json`
- `GET /sync/page`
- `GET /sync/qr.png`
- `GET /sync/url`
- `GET /app` で始まるパス（フロントエンド配信用）
- `GET /favicon.ico`
- `OPTIONS /*` (CORSプリフライト)

## エンドポイント一覧

### 同期関連

#### POST /sync/expenses

支出データの一括同期を行います。

**リクエスト**

```http
POST /sync/expenses
Content-Type: application/json
X-API-Key: your-api-key

{
  "items": [
    {
      "client_uuid": "550e8400-e29b-41d4-a716-446655440000",
      "date": "2024-01-15",
      "amount": 1500,
      "category": "食費",
      "note": "ランチ",
      "paid_by": "me",
      "op": "upsert"
    }
  ]
}
```

**リクエストボディ**

- `items` (array, 必須): 同期する支出アイテムの配列
  - `client_uuid` (string, 必須): クライアント側のUUID（10-36文字）
  - `date` (date, 必須): 日付（YYYY-MM-DD形式）
  - `amount` (integer, 必須): 金額（0以上、10億円以下）
  - `category` (string, 必須): カテゴリ（1-32文字）
  - `note` (string, 任意): メモ（最大200文字）
  - `paid_by` (string, 必須): 支払者（"me" または "her"）
  - `op` (string, 任意): 操作種別（"upsert" または "delete"、デフォルト: "upsert"）

**制限**

- 最大1000件まで一度に同期可能

**レスポンス**

```json
{
  "ok_uuids": [
    "550e8400-e29b-41d4-a716-446655440000"
  ],
  "ng_uuids": []
}
```

- `ok_uuids` (array): 同期成功したアイテムの`client_uuid`配列
- `ng_uuids` (array): 同期失敗したアイテムの`client_uuid`配列

**エラー**

- `400 Bad Request`: リクエストが不正（件数超過、バリデーションエラーなど）
- `401 Unauthorized`: APIキーが不正または未設定
- `500 Internal Server Error`: サーバー内部エラー

**curl例**

```bash
curl -X POST http://localhost:8000/sync/expenses \
  -H "Content-Type: application/json" \
  -H "X-API-Key: household-app-secret-key-2024" \
  -d '{
    "items": [
      {
        "client_uuid": "550e8400-e29b-41d4-a716-446655440000",
        "date": "2024-01-15",
        "amount": 1500,
        "category": "食費",
        "note": "ランチ",
        "paid_by": "me",
        "op": "upsert"
      }
    ]
  }'
```

#### GET /sync/url

同期用のURLとAPIキーを取得します（認証不要）。

**リクエスト**

```http
GET /sync/url
```

**レスポンス**

```json
{
  "base_url": "http://192.168.1.100:8000",
  "api_key": "household-app-secret-key-2024"
}
```

- `base_url` (string): APIのベースURL
- `api_key` (string): APIキー

**curl例**

```bash
curl http://localhost:8000/sync/url
```

#### GET /sync/qr.png

QRコード画像を生成します（認証不要）。

**リクエスト**

```http
GET /sync/qr.png
```

**レスポンス**

- Content-Type: `image/png`
- QRコード画像（PNG形式）

QRコードには、`https://household-app.vercel.app/sync-setup?sync_url={URL}`形式のURLが含まれます。`sync_url`パラメータには`http://[PCのIP]:8000/sync/url`が含まれ、クライアント側でこのURLにアクセスして`base_url`と`api_key`を取得します。

**curl例**

```bash
curl http://localhost:8000/sync/qr.png -o qr.png
```

#### GET /sync/page

QRコード表示用のHTMLページを返します（認証不要）。

**リクエスト**

```http
GET /sync/page
```

**レスポンス**

- Content-Type: `text/html`
- QRコードを表示するHTMLページ

### 集計関連

#### GET /summary

期間指定の合計金額を取得します。

**リクエスト**

```http
GET /summary?start=2024-01-01&end=2024-01-31
X-API-Key: your-api-key
```

**クエリパラメータ**

- `start` (date, 必須): 開始日（YYYY-MM-DD形式）
- `end` (date, 必須): 終了日（YYYY-MM-DD形式）

**レスポンス**

```json
{
  "start": "2024-01-01",
  "end": "2024-01-31",
  "total": 50000
}
```

- `start` (date): 開始日
- `end` (date): 終了日
- `total` (integer): 合計金額

**エラー**

- `400 Bad Request`: 開始日が終了日より後
- `401 Unauthorized`: APIキーが不正または未設定

**curl例**

```bash
curl "http://localhost:8000/summary?start=2024-01-01&end=2024-01-31" \
  -H "X-API-Key: household-app-secret-key-2024"
```

#### GET /summary/by-category

カテゴリ別の集計を取得します。

**リクエスト**

```http
GET /summary/by-category?start=2024-01-01&end=2024-01-31
X-API-Key: your-api-key
```

**レスポンス**

```json
[
  {
    "category": "食費",
    "total": 30000
  },
  {
    "category": "交通費",
    "total": 10000
  }
]
```

**curl例**

```bash
curl "http://localhost:8000/summary/by-category?start=2024-01-01&end=2024-01-31" \
  -H "X-API-Key: household-app-secret-key-2024"
```

#### GET /summary/by-payer

支払者別の集計を取得します。

**リクエスト**

```http
GET /summary/by-payer?start=2024-01-01&end=2024-01-31
X-API-Key: your-api-key
```

**レスポンス**

```json
[
  {
    "paid_by": "me",
    "total": 30000
  },
  {
    "paid_by": "her",
    "total": 20000
  }
]
```

- `paid_by` (string | null): 支払者（"me" または "her"、または null）
- `total` (integer): 合計金額

**curl例**

```bash
curl "http://localhost:8000/summary/by-payer?start=2024-01-01&end=2024-01-31" \
  -H "X-API-Key: household-app-secret-key-2024"
```

#### GET /summary/expenses

期間指定の明細一覧を取得します。

**リクエスト**

```http
GET /summary/expenses?start=2024-01-01&end=2024-01-31&limit=50&offset=0
X-API-Key: your-api-key
```

**クエリパラメータ**

- `start` (date, 必須): 開始日（YYYY-MM-DD形式）
- `end` (date, 必須): 終了日（YYYY-MM-DD形式）
- `limit` (integer, 任意): 取得件数（1-200、デフォルト: 50）
- `offset` (integer, 任意): オフセット（0以上、デフォルト: 0）

**レスポンス**

```json
[
  {
    "id": 1,
    "date": "2024-01-15",
    "amount": 1500,
    "category": "食費",
    "note": "ランチ",
    "paid_by": "me"
  }
]
```

**curl例**

```bash
curl "http://localhost:8000/summary/expenses?start=2024-01-01&end=2024-01-31&limit=50&offset=0" \
  -H "X-API-Key: household-app-secret-key-2024"
```

### 支出管理

#### GET /expenses

月別の支出一覧を取得します。

**リクエスト**

```http
GET /expenses?month=2024-01
X-API-Key: your-api-key
```

**クエリパラメータ**

- `month` (string, 必須): 年月（YYYY-MM形式）

**レスポンス**

```json
[
  {
    "id": 1,
    "client_uuid": "550e8400-e29b-41d4-a716-446655440000",
    "date": "2024-01-15",
    "amount": 1500,
    "category": "食費",
    "note": "ランチ",
    "paid_by": "me"
  }
]
```

**エラー**

- `400 Bad Request`: 月の形式が不正（YYYY-MM形式でない、または月が1-12の範囲外）

**curl例**

```bash
curl "http://localhost:8000/expenses?month=2024-01" \
  -H "X-API-Key: household-app-secret-key-2024"
```

#### DELETE /expenses/{id}

支出を論理削除します。

**リクエスト**

```http
DELETE /expenses/1
X-API-Key: your-api-key
```

**パスパラメータ**

- `id` (integer, 必須): 支出ID

**レスポンス**

```json
{
  "ok": true,
  "id": 1
}
```

**エラー**

- `404 Not Found`: 指定されたIDの支出が存在しない、または既に削除済み
- `401 Unauthorized`: APIキーが不正または未設定
- `500 Internal Server Error`: サーバー内部エラー

**curl例**

```bash
curl -X DELETE http://localhost:8000/expenses/1 \
  -H "X-API-Key: household-app-secret-key-2024"
```

### 統計

#### GET /stats

月別の統計情報を取得します。

**リクエスト**

```http
GET /stats?month=2024-01
X-API-Key: your-api-key
```

**クエリパラメータ**

- `month` (string, 必須): 年月（YYYY-MM形式）

**レスポンス**

```json
{
  "month": "2024-01",
  "total": 50000,
  "by_category": {
    "食費": 30000,
    "交通費": 10000,
    "その他": 10000
  },
  "by_payer": {
    "me": 30000,
    "her": 20000
  }
}
```

- `month` (string): 年月
- `total` (integer): 合計金額
- `by_category` (object): カテゴリ別の合計金額
- `by_payer` (object): 支払者別の合計金額

**エラー**

- `400 Bad Request`: 月の形式が不正

**curl例**

```bash
curl "http://localhost:8000/stats?month=2024-01" \
  -H "X-API-Key: household-app-secret-key-2024"
```

### ヘルスチェック

#### GET /health

サーバーの状態を確認します（認証不要）。

**リクエスト**

```http
GET /health
```

**レスポンス**

```json
{
  "status": "ok"
}
```

**curl例**

```bash
curl http://localhost:8000/health
```

## エラーレスポンス

### エラー形式

すべてのエラーレスポンスは以下の形式です：

```json
{
  "detail": "エラーメッセージ"
}
```

### HTTPステータスコード

- `200 OK`: リクエスト成功
- `400 Bad Request`: リクエストが不正（バリデーションエラーなど）
- `401 Unauthorized`: 認証エラー（APIキーが不正または未設定）
- `404 Not Found`: リソースが見つからない
- `500 Internal Server Error`: サーバー内部エラー
- `503 Service Unavailable`: サービスが利用不可（IPアドレス取得失敗など）

### よくあるエラー

#### 401 Unauthorized

```json
{
  "detail": "API key is missing. Please scan QR code to set API key."
}
```

または

```json
{
  "detail": "Invalid API key. Please scan QR code to set API key."
}
```

**対処法**: `X-API-Key`ヘッダーを正しく設定してください。QRコードを再読み取りしてAPIキーを更新してください。

#### 400 Bad Request

```json
{
  "detail": "Too many items. Maximum 1000 items allowed per request"
}
```

**対処法**: リクエストのアイテム数を1000件以下にしてください。

## レート制限

現在、レート制限は実装されていません。ただし、以下の制限があります：

- 同期リクエスト: 最大1000件まで
- 集計リクエスト: 制限なし（ただし、大量データの場合はパフォーマンスに注意）

## タイムアウト

- 同期リクエスト: 15秒（クライアント側の設定）
- その他のリクエスト: デフォルト（通常30秒）

## 注意事項

1. **日付形式**: すべての日付は`YYYY-MM-DD`形式（ISO 8601）です
2. **金額**: 整数値（円単位）です。小数点以下は使用しません
3. **論理削除**: `DELETE /expenses/{id}`は物理削除ではなく論理削除です。`deleted_at`フィールドが設定されます
4. **同期の重複**: 同じ`client_uuid`で複数回同期しても、最新データで上書きされます（UPSERT）

## 参考

- **[アーキテクチャ](architecture.md)**: システム設計の詳細
- **[サーバー開発ガイド](../server/README.md)**: サーバー側の開発方法

