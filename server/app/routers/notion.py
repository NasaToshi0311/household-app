from dataclasses import asdict
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.services.monthly import month_range, previous_month
from app.services.notion import NotionError, sync_month

router = APIRouter(prefix="/notion", tags=["notion"])


@router.post("/sync")  # 月次のカテゴリ別合計を Notion に送る  POST /notion/sync?month=YYYY-MM
def notion_sync(
    month: Optional[str] = Query(None, pattern=r"^\d{4}-\d{2}$"),  # 省略時は先月（日本時間）
    db: Session = Depends(get_db),
):
    month = month or previous_month()
    try:
        month_range(month)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        result = sync_month(db, month)
    except NotionError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return asdict(result)
