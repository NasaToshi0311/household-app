from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.db import get_db
from app.models.expense import Expense
from app.services.monthly import month_range, category_totals

router = APIRouter(prefix="/stats", tags=["stats"]) # 統計ルーター

@router.get("") # 月ごとの統計を取得するエンドポイント  GET /stats
def monthly_stats(
    month: str = Query(..., pattern=r"^\d{4}-\d{2}$"), # 月  YYYY-MM
    db: Session = Depends(get_db), # セッション
):
    try:
        start, end = month_range(month) # 開始日・終了日  [月初, 翌月初)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    base_where = (Expense.date >= start, Expense.date < end, Expense.deleted_at.is_(None)) # 条件

    total = db.execute(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(*base_where)
    ).scalar_one() # 合計金額

    by_category = category_totals(db, month) # カテゴリ別合計金額（固定順序）

    by_payer_rows = db.execute(
        select(Expense.paid_by, func.sum(Expense.amount))
        .where(*base_where)
        .group_by(Expense.paid_by)
    ).all() # 支払者別合計金額

    return {
        "month": month, # 月
        "total": int(total), # 合計金額
        "by_category": {c.category: c.total for c in by_category}, # カテゴリ別合計金額（固定順序）
        "by_payer": {k: int(v) for k, v in by_payer_rows}, # 支払者別合計金額
    } # 結果を返す
