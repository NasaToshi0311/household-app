from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, desc
from app.db import get_db
from app.models.expense import Expense

router = APIRouter(prefix="/expenses", tags=["expenses"]) # 支出ルーター

@router.get("") # 支出を一覧表示するエンドポイント  GET /expenses
def list_expenses(month: str = Query(..., pattern=r"^\d{4}-\d{2}$"), db: Session = Depends(get_db)): # 支出を一覧表示するエンドポイント
    y, m = map(int, month.split("-")) # 年月を分割  year, month
    start = date(y, m, 1) # 開始日
    end = date(y + 1, 1, 1) if m == 12 else date(y, m + 1, 1) # 終了日

    stmt = ( # ステートメントを作成
        select(Expense) # 支出モデルを選択
        .where(Expense.date >= start, Expense.date < end, Expense.deleted_at.is_(None)) # 日付が開始日から終了日の間
        .order_by(desc(Expense.date), desc(Expense.id)) # 日付とIDで降順ソート
    )
    rows = db.execute(stmt).scalars().all() # ステートメントを実行して結果を取得
    return [ # 結果を返す
        { # 結果を返す
            "id": r.id, # 支出ID
            "client_uuid": r.client_uuid, # クライアントUUID
            "date": r.date.isoformat(), # 日付
            "amount": r.amount, # 金額 
            "category": r.category, # カテゴリ
            "note": r.note, # 備考
            "paid_by": r.paid_by, # 支払者
        } for r in rows
    ]

@router.delete("/{expense_id}")
def soft_delete_expense(expense_id: int, db: Session = Depends(get_db)):
    exp = (
        db.query(Expense)
        .filter(Expense.id == expense_id, Expense.deleted_at.is_(None))
        .first()
    )
    if not exp:
        raise HTTPException(status_code=404, detail="Not Found")

    exp.deleted_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True, "id": expense_id}
