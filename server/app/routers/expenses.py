from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, desc
from app.db import get_db
from app.models.expense import Expense

router = APIRouter(prefix="/expenses", tags=["expenses"]) # 支出ルーター

@router.get("") # 支出を一覧表示するエンドポイント  GET /expenses
def list_expenses(month: str = Query(..., pattern=r"^\d{4}-\d{2}$"), db: Session = Depends(get_db)): # 支出を一覧表示するエンドポイント  GET /expenses
    y, m = map(int, month.split("-")) # 年月を分割  year, month
    start = date(y, m, 1) # 開始日
    end = date(y + 1, 1, 1) if m == 12 else date(y, m + 1, 1) # 終了日  end of the month

    stmt = ( # ステートメントを作成
        select(Expense) # 支出モデルを選択  select * from expenses
        .where(Expense.date >= start, Expense.date < end) # 日付が開始日から終了日の間  where date >= start and date < end
        .order_by(desc(Expense.date), desc(Expense.id)) # 日付とIDで降順ソート  order by date desc, id desc
    )
    rows = db.execute(stmt).scalars().all() # ステートメントを実行して結果を取得  execute the statement and get the results
    return [ # 結果を返す
        { # 結果を返す
            "id": r.id, # 支出ID  id
            "client_uuid": r.client_uuid, # クライアントUUID  client_uuid
            "date": r.date.isoformat(), # 日付  date
            "amount": r.amount, # 金額  amount
            "category": r.category, # カテゴリ  category
            "note": r.note, # 備考  note
            "paid_by": r.paid_by, # 支払者  paid_by
        } for r in rows # 結果を返す  return the results
    ]
