# 月単位の集計ロジック（/stats と Notion 同期で共通利用）
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.expense import Expense
from app.constants.category import get_category_order

JST = timezone(timedelta(hours=9))  # 日本時間（サマータイムなし）


def month_range(month: str) -> tuple[date, date]:
    """'YYYY-MM' から [月初, 翌月初) を返す。不正な値は ValueError"""
    try:
        y, m = map(int, month.split("-"))
        start = date(y, m, 1)
    except ValueError:
        raise ValueError("Invalid month. Use YYYY-MM with month between 01 and 12")
    end = date(y + 1, 1, 1) if m == 12 else date(y, m + 1, 1)
    return start, end


def previous_month(now: datetime | None = None) -> str:
    """日本時間で見た先月を 'YYYY-MM' で返す"""
    today = (now or datetime.now(JST)).astimezone(JST).date()
    last_day_prev = today.replace(day=1) - timedelta(days=1)
    return last_day_prev.strftime("%Y-%m")


@dataclass
class CategoryTotal:
    category: str
    total: int
    count: int


def category_totals(db: Session, month: str) -> list[CategoryTotal]:
    """指定月の、削除されていない支出のカテゴリ別合計と件数（カテゴリの固定順）"""
    start, end = month_range(month)
    rows = db.execute(
        select(Expense.category, func.sum(Expense.amount), func.count(Expense.id))
        .where(Expense.date >= start, Expense.date < end, Expense.deleted_at.is_(None))
        .group_by(Expense.category)
    ).all()
    items = [CategoryTotal(category=c, total=int(t), count=int(n)) for c, t, n in rows]
    items.sort(key=lambda x: (get_category_order(x.category), x.category))
    return items
