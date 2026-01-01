from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
import logging

from app.db import get_db
from app.models.expense import Expense
from app.schemas.sync import SyncExpensesRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sync", tags=["sync"])

# 一度に同期できる最大件数（DoS対策）
MAX_SYNC_ITEMS = 1000

@router.post("/expenses")
def sync_expenses(payload: SyncExpensesRequest, db: Session = Depends(get_db)):
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
