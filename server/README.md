# Household App - サーバー（バックエンド）

FastAPIで実装された家計簿アプリのバックエンドサーバーです。

## 概要

- FastAPI + Python で構築
- PostgreSQLデータベースを使用
- Dockerコンテナで実行
- APIキー認証によるセキュリティ対策

## 技術スタック

- **フレームワーク**: FastAPI 0.115.6
- **言語**: Python 3.12
- **ORM**: SQLAlchemy 2.0.36
- **データベースドライバ**: psycopg[binary] 3.2.3
- **バリデーション**: Pydantic 2.10.2
- **QRコード生成**: qrcode 8.0
- **Webサーバー**: Uvicorn 0.32.1
- **データベース**: PostgreSQL 16

## ディレクトリ構成

```
server/
├── app/
│   ├── main.py              # FastAPIアプリケーションのエントリーポイント
│   ├── db.py                # データベース接続設定
│   ├── models/              # SQLAlchemyモデル
│   │   └── expense.py      # Expenseモデル
│   ├── routers/            # APIルーター
│   │   ├── sync.py         # 同期エンドポイント
│   │   ├── sync_qr.py      # QRコード生成エンドポイント
│   │   ├── expenses.py     # 支出管理エンドポイント
│   │   ├── summary.py      # 集計エンドポイント
│   │   └── stats.py        # 統計エンドポイント
│   ├── schemas/            # Pydanticスキーマ
│   │   └── sync.py         # 同期リクエスト/レスポンススキーマ
│   └── middleware/        # ミドルウェア
│       └── auth.py         # APIキー認証ミドルウェア
├── static/                 # 静的ファイル（フロントエンドのビルド結果）
│   └── dist/
├── Dockerfile              # Dockerイメージ定義
├── docker-compose.yml      # Docker Compose設定
├── requirements.txt       # Python依存パッケージ
└── backup_db.ps1          # データベースバックアップスクリプト
```

## 開発環境のセットアップ

### 前提条件

- Docker / Docker Compose がインストールされていること
- Python 3.12以上（ローカル開発の場合）

### Dockerを使用した開発

```bash
# サーバー起動
cd server
docker compose up -d

# ログ確認
docker compose logs -f api

# 停止
docker compose down
```

### ローカル開発（Dockerなし）

```bash
# 仮想環境の作成
python -m venv venv

# 仮想環境の有効化
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# 依存パッケージのインストール
pip install -r requirements.txt

# 環境変数の設定
export DATABASE_URL="postgresql+psycopg://household:household@localhost:5432/household"
export API_KEY="household-app-secret-key-2024"
export CORS_ORIGINS="http://localhost:5173"
export HOST_IP="192.168.1.100"

# サーバー起動
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## コード構造

### エントリーポイント (`app/main.py`)

- FastAPIアプリケーションの初期化
- CORS設定
- ミドルウェアの登録
- ルーターの登録
- 静的ファイルのマウント

### データベース (`app/db.py`)

- SQLAlchemyエンジンの作成
- セッションファクトリーの設定
- 依存性注入用の`get_db()`関数

### モデル (`app/models/expense.py`)

- `Expense`モデル: 支出データのテーブル定義
- SQLAlchemyのORMマッピング

### ルーター (`app/routers/`)

各ルーターは独立したモジュールとして実装されています：

- **sync.py**: 支出データの同期処理（`POST /sync/expenses`）
- **sync_qr.py**: QRコード生成（`GET /sync/qr.png`, `GET /sync/url`, `GET /sync/page`）
- **expenses.py**: 支出の一覧取得・削除（`GET /expenses`, `DELETE /expenses/{id}`）
- **summary.py**: 期間指定の集計（`GET /summary/*`）
- **stats.py**: 月別統計（`GET /stats`）

### スキーマ (`app/schemas/sync.py`)

- Pydanticモデルによるリクエスト/レスポンスのバリデーション
- `SyncExpenseItem`: 同期用の支出アイテム
- `SyncExpensesRequest`: 同期リクエスト全体

### ミドルウェア (`app/middleware/auth.py`)

- APIキー認証の実装
- `X-API-Key`ヘッダーの検証
- 認証不要なパスの除外

## 新しいエンドポイントの追加方法

### 1. ルーターの作成

`app/routers/`ディレクトリに新しいファイルを作成：

```python
from fastapi import APIRouter

router = APIRouter(prefix="/your-prefix", tags=["your-tag"])

@router.get("/your-endpoint")
def your_endpoint():
    return {"message": "Hello"}
```

### 2. メインアプリに登録

`app/main.py`にルーターを追加：

```python
from app.routers.your_router import router as your_router

app.include_router(your_router)
```

### 3. データベースアクセスが必要な場合

依存性注入を使用：

```python
from sqlalchemy.orm import Session
from app.db import get_db

@router.get("/your-endpoint")
def your_endpoint(db: Session = Depends(get_db)):
    # データベース操作
    return {"result": "ok"}
```

### 4. 認証が必要な場合

APIキー認証は自動的に適用されます（`/health`, `/docs`などは除外）。

## デバッグ方法

### ログの確認

```bash
# APIログをリアルタイムで確認
docker compose logs -f api

# 特定の行数だけ表示
docker compose logs --tail=100 api
```

### FastAPIの自動リロード

Dockerfileで`--reload`フラグが設定されているため、コード変更が自動的に反映されます。

### データベースの直接確認

```bash
# PostgreSQLに接続
docker compose exec db psql -U household -d household

# SQLクエリの実行
SELECT * FROM expenses ORDER BY date DESC LIMIT 10;
```

### APIドキュメント

FastAPIの自動生成ドキュメントを確認：

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## テスト

### 手動テスト

```bash
# ヘルスチェック
curl http://localhost:8000/health

# 同期エンドポイントのテスト（APIキーが必要）
curl -X POST http://localhost:8000/sync/expenses \
  -H "Content-Type: application/json" \
  -H "X-API-Key: household-app-secret-key-2024" \
  -d '{"items": []}'
```

### 環境変数の確認

```bash
# コンテナ内の環境変数を確認
docker compose exec api env | grep -E "API_KEY|DATABASE_URL|CORS_ORIGINS|HOST_IP"
```

## 本番環境への反映

### コード変更時

```bash
# コンテナを再起動（コード変更を反映）
docker compose restart api

# または、完全に再ビルド
docker compose up -d --build
```

### 環境変数の変更時

`docker-compose.yml`を編集後：

```bash
docker compose up -d --force-recreate api
```

## パフォーマンス最適化

### データベース接続プール

SQLAlchemyの接続プール設定は`app/db.py`で管理されています。

### インデックスの確認

```sql
-- インデックスの確認
\d expenses

-- インデックスの作成（必要に応じて）
CREATE INDEX idx_expenses_date ON expenses(date);
```

## セキュリティ

### APIキー認証

- すべてのAPIリクエストに`X-API-Key`ヘッダーが必要
- 認証不要なパスは`app/middleware/auth.py`の`PUBLIC_PATHS`で定義
  - `/health`, `/docs`, `/openapi.json`, `/sync/page`, `/sync/qr.png`, `/sync/url`, `/app`で始まるパス, `/favicon.ico`
  - OPTIONSリクエスト（CORSプリフライト）も認証不要

### CORS設定

- 環境変数`CORS_ORIGINS`で許可オリジンを指定（カンマ区切り）
- デフォルト値（`CORS_ORIGINS`未設定時）:
  - `https://household-app.vercel.app`
  - `http://10.76.108.202:5173`
  - `http://localhost:5173`
  - `http://127.0.0.1:5173`

## トラブルシューティング

### サーバーが起動しない

1. ログを確認: `docker compose logs api`
2. ポート8000が使用されていないか確認
3. データベースコンテナが起動しているか確認

### データベース接続エラー

1. `DATABASE_URL`環境変数を確認
2. データベースコンテナが起動しているか確認: `docker compose ps db`
3. データベースログを確認: `docker compose logs db`

### 認証エラー

1. `API_KEY`環境変数を確認
2. クライアント側のAPIキーと一致しているか確認
3. ミドルウェアのログを確認

詳細は `docs/TROUBLESHOOTING.md` を参照してください。

## 参考ドキュメント

- **[セットアップガイド](../docs/SETUP.md)**: 初回セットアップ手順
- **[運用・保守ガイド](../docs/OPERATIONS.md)**: 日常的な運用方法
- **[アーキテクチャ](../docs/architecture.md)**: システム設計の詳細
- **[APIリファレンス](../docs/API.md)**: APIエンドポイントの詳細
- **[データベーススキーマ](../docs/DATABASE.md)**: データベース構造の詳細

