# データベーススキーマ

Household Appのデータベース構造の詳細です。

## データベース情報

- **データベース名**: `household`
- **ユーザー名**: `household`
- **パスワード**: `household`（デフォルト）
- **ホスト**: `localhost`（Dockerコンテナ内では`db`）
- **ポート**: `5432`
- **DBMS**: PostgreSQL 16

## テーブル構造

### expenses テーブル

支出データを保存するメインテーブルです。

#### カラム定義

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| `id` | INTEGER | PRIMARY KEY, AUTO INCREMENT | 主キー（自動採番） |
| `client_uuid` | VARCHAR(36) | UNIQUE, NOT NULL, INDEX | クライアント側のUUID（一意キー） |
| `date` | DATE | NOT NULL | 支出日（YYYY-MM-DD形式） |
| `amount` | INTEGER | NOT NULL | 金額（円単位、整数） |
| `category` | VARCHAR(32) | NOT NULL | カテゴリ（最大32文字） |
| `note` | VARCHAR(200) | NULL | メモ（最大200文字、任意） |
| `paid_by` | VARCHAR(8) | NOT NULL | 支払者（"me" または "her"） |
| `created_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | 作成日時（UTC） |
| `updated_at` | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT NOW() | 更新日時（UTC、SQLAlchemyのonupdateで自動更新） |
| `deleted_at` | TIMESTAMP WITH TIME ZONE | NULL | 削除日時（論理削除、UTC） |

#### インデックス

- **PRIMARY KEY**: `id`
- **UNIQUE INDEX**: `client_uuid`（重複防止・高速検索用）

#### 制約

- `client_uuid`は一意でなければならない（重複不可）
- `amount`は0以上である必要がある（アプリケーション層でバリデーション）
- `category`は1文字以上32文字以下
- `note`は200文字以下（NULL可）
- `paid_by`は"me"または"her"のいずれか（アプリケーション層でバリデーション）

#### SQL定義

```sql
CREATE TABLE expenses (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    client_uuid VARCHAR(36) UNIQUE NOT NULL,
    date DATE NOT NULL,
    amount INTEGER NOT NULL,
    category VARCHAR(32) NOT NULL,
    note VARCHAR(200),
    paid_by VARCHAR(8) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE UNIQUE INDEX idx_expenses_client_uuid ON expenses(client_uuid);
```

**注意**: `updated_at`の自動更新は、SQLAlchemyの`onupdate=func.now()`によりアプリケーションレベルで実装されています。PostgreSQLの標準SQLでは`ON UPDATE`句はサポートされていません。

## データモデル

### Expense モデル（SQLAlchemy）

```python
class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    client_uuid: Mapped[str] = mapped_column(String(36), unique=True, index=True, nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    note: Mapped[str | None] = mapped_column(String(200), nullable=True)
    paid_by: Mapped[str] = mapped_column(String(8), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
```

## データ操作

### 挿入（INSERT）

新しい支出データを挿入します。

```sql
INSERT INTO expenses (client_uuid, date, amount, category, note, paid_by)
VALUES ('550e8400-e29b-41d4-a716-446655440000', '2024-01-15', 1500, '食費', 'ランチ', 'me');
```

### 更新（UPDATE）

既存の支出データを更新します。

```sql
UPDATE expenses
SET amount = 2000, updated_at = NOW()
WHERE client_uuid = '550e8400-e29b-41d4-a716-446655440000';
```

### UPSERT（ON CONFLICT DO UPDATE）

PostgreSQLの`ON CONFLICT DO UPDATE`を使用して、存在する場合は更新、存在しない場合は挿入します。

```sql
INSERT INTO expenses (client_uuid, date, amount, category, note, paid_by)
VALUES ('550e8400-e29b-41d4-a716-446655440000', '2024-01-15', 1500, '食費', 'ランチ', 'me')
ON CONFLICT (client_uuid) DO UPDATE
SET date = EXCLUDED.date,
    amount = EXCLUDED.amount,
    category = EXCLUDED.category,
    note = EXCLUDED.note,
    paid_by = EXCLUDED.paid_by,
    updated_at = NOW();
```

### 論理削除（SOFT DELETE）

`deleted_at`フィールドを設定して論理削除します。

```sql
UPDATE expenses
SET deleted_at = NOW()
WHERE id = 1;
```

### 物理削除（HARD DELETE）

データを完全に削除します（注意: 復元不可）。

```sql
DELETE FROM expenses WHERE id = 1;
```

### 論理削除されたデータの取得

論理削除されたデータも含めて取得します。

```sql
SELECT * FROM expenses WHERE deleted_at IS NOT NULL;
```

### 有効なデータのみ取得

論理削除されていないデータのみ取得します。

```sql
SELECT * FROM expenses WHERE deleted_at IS NULL;
```

## クエリ例

### 期間指定でデータを取得

```sql
SELECT * FROM expenses
WHERE date >= '2024-01-01' AND date <= '2024-01-31'
AND deleted_at IS NULL
ORDER BY date DESC, id DESC;
```

### カテゴリ別の集計

```sql
SELECT category, SUM(amount) AS total
FROM expenses
WHERE date >= '2024-01-01' AND date <= '2024-01-31'
AND deleted_at IS NULL
GROUP BY category
ORDER BY total DESC;
```

### 支払者別の集計

```sql
SELECT paid_by, SUM(amount) AS total
FROM expenses
WHERE date >= '2024-01-01' AND date <= '2024-01-31'
AND deleted_at IS NULL
GROUP BY paid_by
ORDER BY total DESC;
```

### 月別の合計

```sql
SELECT 
    DATE_TRUNC('month', date) AS month,
    SUM(amount) AS total
FROM expenses
WHERE deleted_at IS NULL
GROUP BY month
ORDER BY month DESC;
```

### 最新10件のデータを取得

```sql
SELECT * FROM expenses
WHERE deleted_at IS NULL
ORDER BY date DESC, id DESC
LIMIT 10;
```

### 重複データの確認

```sql
SELECT client_uuid, COUNT(*) AS count
FROM expenses
GROUP BY client_uuid
HAVING COUNT(*) > 1;
```

## インデックス

### 現在のインデックス

- `idx_expenses_client_uuid`: `client_uuid`カラムのユニークインデックス

### 追加可能なインデックス

パフォーマンス向上のために、以下のインデックスを追加することができます：

```sql
-- 日付での検索を高速化
CREATE INDEX idx_expenses_date ON expenses(date);

-- 日付と削除状態での検索を高速化
CREATE INDEX idx_expenses_date_deleted ON expenses(date) WHERE deleted_at IS NULL;

-- カテゴリでの検索を高速化
CREATE INDEX idx_expenses_category ON expenses(category);
```

**注意**: インデックスを追加すると、INSERT/UPDATEのパフォーマンスが若干低下する可能性があります。データ量が多い場合や、特定のクエリが遅い場合にのみ追加することを推奨します。

## データ型の詳細

### INTEGER

- 範囲: -2,147,483,648 ～ 2,147,483,647
- 金額は整数値（円単位）で保存されます
- 小数点以下は使用しません

### VARCHAR

- `client_uuid`: 最大36文字（UUID v4形式: `550e8400-e29b-41d4-a716-446655440000`）
- `category`: 最大32文字
- `note`: 最大200文字（NULL可）
- `paid_by`: 最大8文字（実際には"me"または"her"のみ）

### DATE

- 形式: `YYYY-MM-DD`（ISO 8601）
- 例: `2024-01-15`
- タイムゾーン情報は含まれません

### TIMESTAMP WITH TIME ZONE

- 形式: `YYYY-MM-DD HH:MM:SS+TZ`
- 例: `2024-01-15 12:00:00+00:00`
- UTCで保存されます
- `created_at`, `updated_at`, `deleted_at`に使用

## データ整合性

### 制約

1. **UNIQUE制約**: `client_uuid`は一意でなければならない
2. **NOT NULL制約**: `id`, `client_uuid`, `date`, `amount`, `category`, `paid_by`, `created_at`, `updated_at`は必須
3. **外部キー制約**: 現在は使用されていない（将来的にユーザーテーブルなどと関連付ける場合に使用）

### トランザクション

同期処理（`POST /sync/expenses`）では、トランザクションを使用してデータ整合性を保証しています：

```python
try:
    # 複数のアイテムを処理
    for item in items:
        # UPSERT処理
    db.commit()
except Exception:
    db.rollback()
    raise
```

## バックアップと復元

### バックアップ

```bash
# 手動バックアップ
docker compose exec -T db pg_dump -U household household > backup_$(date +%Y-%m-%d).sql

# 自動バックアップ（PowerShellスクリプト）
cd server
.\backup_db.ps1
```

### 復元

```bash
# バックアップから復元
docker compose exec -T db psql -U household -d household < backup_2024-01-15.sql
```

## メンテナンス

### VACUUM

データベースの最適化と不要な領域の回収を行います。

```sql
VACUUM ANALYZE expenses;
```

### 統計情報の更新

```sql
ANALYZE expenses;
```

### テーブルサイズの確認

```sql
SELECT 
    pg_size_pretty(pg_total_relation_size('expenses')) AS total_size,
    pg_size_pretty(pg_relation_size('expenses')) AS table_size,
    pg_size_pretty(pg_indexes_size('expenses')) AS indexes_size;
```

## マイグレーション

現在、マイグレーションツール（Alembicなど）は使用していません。テーブルは`Base.metadata.create_all()`で自動生成されます。

将来的にマイグレーションが必要な場合は、Alembicなどのツールを導入することを推奨します。

## パフォーマンス

### クエリの最適化

1. **インデックスの活用**: `client_uuid`のインデックスを活用
2. **WHERE句の最適化**: `deleted_at IS NULL`条件を追加
3. **LIMIT句の使用**: 大量データを取得する場合は`LIMIT`を使用

### パフォーマンス監視

```sql
-- クエリの実行計画を確認
EXPLAIN ANALYZE SELECT * FROM expenses WHERE date >= '2024-01-01' AND date <= '2024-01-31' AND deleted_at IS NULL;

-- スロークエリの確認（PostgreSQLのログ設定が必要）
-- log_min_duration_statement = 1000  # 1秒以上かかるクエリをログに記録
```

## セキュリティ

### アクセス制御

- データベースはDockerコンテナ内で実行され、外部から直接アクセスできません
- アプリケーション層（FastAPI）を通じてのみアクセス可能
- APIキー認証により、不正なアクセスを防止

### データ保護

- 論理削除により、誤って削除したデータを復元可能
- 定期的なバックアップにより、データ損失を防止

## 参考

- **[運用・保守ガイド](OPERATIONS.md)**: データベース操作の詳細
- **[アーキテクチャ](architecture.md)**: データモデルの詳細
- **[サーバー開発ガイド](../server/README.md)**: データベース接続の設定

