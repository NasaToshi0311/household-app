from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db import get_db
from app.constants.category import get_category_order

router = APIRouter(prefix="/summary", tags=["summary"])


class SummaryResponse(BaseModel):
    start: date
    end: date
    total: int


class CategorySummaryItem(BaseModel):
    category: str
    total: int


class PayerSummaryItem(BaseModel):
    paid_by: Optional[str]
    total: int


class ExpenseItem(BaseModel):
    id: Optional[int] = None
    client_uuid: Optional[str] = None
    date: date
    amount: int
    category: str
    note: Optional[str] = None
    paid_by: Optional[str] = None


@router.get("", response_model=SummaryResponse)
def get_summary(
    start: date = Query(...),
    end: date = Query(...),
    db: Session = Depends(get_db),
):
    if start > end:
        raise HTTPException(status_code=400, detail="Start date must be less than or equal to end date")
    
    sql = text("""
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM expenses
        WHERE date >= :start AND date <= :end
        AND deleted_at IS NULL
    """)

    row = db.execute(sql, {"start": start, "end": end}).first()
    total = int(row.total) if row and row.total is not None else 0
    return SummaryResponse(start=start, end=end, total=total)


@router.get("/by-category", response_model=List[CategorySummaryItem])
def get_summary_by_category(
    start: date = Query(...),
    end: date = Query(...),
    db: Session = Depends(get_db),
):
    if start > end:
        raise HTTPException(status_code=400, detail="Start date must be less than or equal to end date")
    
    sql = text("""
        SELECT category, COALESCE(SUM(amount), 0) AS total
        FROM expenses
        WHERE date >= :start AND date <= :end
        AND deleted_at IS NULL
        GROUP BY category
    """)

    rows = db.execute(sql, {"start": start, "end": end}).all()
    # 固定順序でソート
    items = [CategorySummaryItem(category=r.category, total=int(r.total)) for r in rows]
    items.sort(key=lambda x: (get_category_order(x.category), x.category))
    return items


@router.get("/by-payer", response_model=List[PayerSummaryItem])
def get_summary_by_payer(
    start: date = Query(...),
    end: date = Query(...),
    db: Session = Depends(get_db),
):
    if start > end:
        raise HTTPException(status_code=400, detail="Start date must be less than or equal to end date")
    
    sql = text("""
        SELECT paid_by, COALESCE(SUM(amount), 0) AS total
        FROM expenses
        WHERE date >= :start AND date <= :end
        AND deleted_at IS NULL
        GROUP BY paid_by
        ORDER BY total DESC
    """)

    rows = db.execute(sql, {"start": start, "end": end}).all()
    return [PayerSummaryItem(paid_by=r.paid_by, total=int(r.total)) for r in rows]


@router.get("/expenses", response_model=List[ExpenseItem])
def list_expenses(
    start: date = Query(...),
    end: date = Query(...),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    if start > end:
        raise HTTPException(status_code=400, detail="Start date must be less than or equal to end date")
    
    sql = text("""
        SELECT id, client_uuid, date, amount, category, note, paid_by
        FROM expenses
        WHERE date >= :start AND date <= :end
        AND deleted_at IS NULL
        ORDER BY date DESC, id DESC
        LIMIT :limit OFFSET :offset
    """)

    rows = db.execute(
        sql,
        {"start": start, "end": end, "limit": limit, "offset": offset},
    ).all()

    return [
        ExpenseItem(
            id=r.id,
            client_uuid=r.client_uuid,
            date=r.date,
            amount=int(r.amount),
            category=r.category,
            note=r.note,
            paid_by=r.paid_by,
        )
        for r in rows
    ]
