from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.db import get_db
from app.models.expense import Expense

router = APIRouter(prefix="/stats", tags=["stats"]) # 統計ルーター

@router.get("") # 月ごとの統計を取得するエンドポイント  GET /stats
def monthly_stats(
    month: str = Query(..., pattern=r"^\d{4}-\d{2}$"), # 月  YYYY-MM
    db: Session = Depends(get_db), # セッション
):
    y, m = map(int, month.split("-")) # 年月を分割  year, month
    start = date(y, m, 1) # 開始日  start of the month
    end = date(y + 1, 1, 1) if m == 12 else date(y, m + 1, 1) # 終了日  end of the month

    base_where = (Expense.date >= start, Expense.date < end) # 条件

    total = db.execute(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(*base_where)
    ).scalar_one() # 合計金額

    by_category_rows = db.execute(
        select(Expense.category, func.sum(Expense.amount))
        .where(*base_where)
        .group_by(Expense.category)
        .order_by(func.sum(Expense.amount).desc())
    ).all() # カテゴリ別合計金額

    by_payer_rows = db.execute(
        select(Expense.paid_by, func.sum(Expense.amount))
        .where(*base_where)
        .group_by(Expense.paid_by)
    ).all() # 支払者別合計金額

    return {
        "month": month, # 月
        "total": int(total), # 合計金額
        "by_category": {k: int(v) for k, v in by_category_rows}, # カテゴリ別合計金額
        "by_payer": {k: int(v) for k, v in by_payer_rows}, # 支払者別合計金額
    } # 結果を返す
