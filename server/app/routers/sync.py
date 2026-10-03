from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
import logging

from app.db import get_db
from app.models.expense import Expense
from app.schemas.sync import ChangeItem, SyncChangesResponse, SyncExpensesRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sync", tags=["sync"])

# 一度に同期できる最大件数（DoS対策）
MAX_SYNC_ITEMS = 1000

@router.post("/expenses")
def sync_expenses(payload: SyncExpensesRequest, db: Session = Depends(get_db)):
    # デバッグ用: リクエスト受信をログ出力
    logger.info(f"同期リクエスト受信: {len(payload.items)}件")
    
    if not payload.items:
        return {"ok_uuids": [], "ng_uuids": []}
    
    if len(payload.items) > MAX_SYNC_ITEMS:
        raise HTTPException(
            status_code=400,
            detail=f"Too many items. Maximum {MAX_SYNC_ITEMS} items allowed per request"
        )
    
    ok_uuids: list[str] = []
    ng_uuids: list[str] = []

    now = datetime.now(timezone.utc)

    try:
        for item in payload.items:
            try:
                deleted_at_value = now if item.op == "delete" else None

                stmt = (
                    insert(Expense)
                    .values(
                        client_uuid=item.client_uuid,
                        date=item.date,
                        amount=item.amount,
                        category=item.category,
                        note=item.note,
                        paid_by=item.paid_by,
                        deleted_at=deleted_at_value,
                    )
                    .on_conflict_do_update(
                        index_elements=["client_uuid"],
                        set_={
                            "date": item.date,
                            "amount": item.amount,
                            "category": item.category,
                            "note": item.note,
                            "paid_by": item.paid_by,
                            "deleted_at": deleted_at_value,  # deleteならnow / upsertならNone（復活）
                            "updated_at": now,
                        },
                    )
                )

                db.execute(stmt)
                ok_uuids.append(item.client_uuid)

            except Exception as e:
                logger.error(f"Failed to sync expense {item.client_uuid}: {e}", exc_info=True)
                ng_uuids.append(item.client_uuid)

        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Transaction failed during sync: {e}", exc_info=True)
        raise

    return {"ok_uuids": ok_uuids, "ng_uuids": ng_uuids}


@router.get("/changes", response_model=SyncChangesResponse)
def get_changes(
    since: datetime | None = Query(None, description="この時刻より後に更新されたデータのみ返す（省略時は全件）"),
    until: datetime | None = Query(None, description="ページング用の上限時刻（1ページ目のレスポンスの until をそのまま渡す）"),
    limit: int = Query(500, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """
    差分同期用: 更新・削除されたデータを返す
    論理削除済みのデータも deleted=True で返すので、他の端末で削除した明細もクライアントから消せる
    """
    if until is None:
        until = db.execute(select(func.now())).scalar_one()

    stmt = select(Expense).where(Expense.updated_at <= until)
    if since is not None:
        stmt = stmt.where(Expense.updated_at > since)
    stmt = stmt.order_by(Expense.updated_at, Expense.id).limit(limit).offset(offset)

    rows = db.execute(stmt).scalars().all()

    return SyncChangesResponse(
        items=[
            ChangeItem(
                client_uuid=r.client_uuid,
                date=r.date,
                amount=r.amount,
                category=r.category,
                note=r.note,
                paid_by=r.paid_by,
                deleted=r.deleted_at is not None,
            )
            for r in rows
        ],
        until=until,
    )
