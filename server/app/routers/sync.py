from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
from app.db import get_db
from app.models.expense import Expense
from app.schemas.sync import SyncExpensesRequest

router = APIRouter(prefix="/sync", tags=["sync"]) # 同期ルーター

@router.post("/expenses") # 支出を同期するエンドポイント
def sync_expenses(payload: SyncExpensesRequest, db: Session = Depends(get_db)): # 支出を同期するエンドポイント
    inserted = 0 # 挿入された数
    skipped = 0 # スキップされた数

    for item in payload.items: # 支出項目を一つずつ処理
        stmt = ( # ステートメントを作成
            insert(Expense) # 支出モデルに挿入
            .values(
                client_uuid=item.client_uuid, # クライアントUUID
                date=item.date, # 日付
                amount=item.amount, # 金額
                category=item.category, # カテゴリ
                note=item.note, # 備考
                paid_by=item.paid_by, # 支払者
            )
            .on_conflict_do_nothing(index_elements=["client_uuid"]) # 重複はclient_uuidのUNIQUEで弾く
        )
        res = db.execute(stmt) # ステートメントを実行
        if res.rowcount == 1: # 挿入された数を増やす
            inserted += 1 # 挿入された数を増やす
        else: # スキップされた数を増やす
            skipped += 1 # スキップされた数を増やす

    db.commit() # コミット
    return {"inserted": inserted, "skipped": skipped} # 挿入された数とスキップされた数を返す
