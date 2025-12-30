from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db import get_db  # あなたの get_db に合わせる

router = APIRouter(prefix="/summary", tags=["summary"])


class SummaryResponse(BaseModel):
    start: date
    end: date
    total: int


class CategorySummaryItem(BaseModel):
    category: str
    total: int


class ExpenseItem(BaseModel):
    id: Optional[int] = None
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
    sql = text("""
        SELECT COALESCE(SUM(amount), 0) AS total
        FROM expenses
        WHERE date >= :start AND date <= :end
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
    sql = text("""
        SELECT category, COALESCE(SUM(amount), 0) AS total
        FROM expenses
        WHERE date >= :start AND date <= :end
        GROUP BY category
        ORDER BY total DESC
    """)
    rows = db.execute(sql, {"start": start, "end": end}).all()
    return [CategorySummaryItem(category=r.category, total=int(r.total)) for r in rows]


@router.get("/expenses", response_model=List[ExpenseItem])
def list_expenses(
    start: date = Query(...),
    end: date = Query(...),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    sql = text("""
        SELECT id, date, amount, category, note, paid_by
        FROM expenses
        WHERE date >= :start AND date <= :end
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
            date=r.date,
            amount=int(r.amount),
            category=r.category,
            note=r.note,
            paid_by=r.paid_by,
        )
        for r in rows
    ]
