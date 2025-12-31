from datetime import date
from pydantic import BaseModel, Field
from typing import Literal

Payer = Literal["me", "her"]
Op = Literal["upsert", "delete"]

class SyncExpenseItem(BaseModel):
    client_uuid: str = Field(min_length=10)
    date: date
    amount: int = Field(ge=0)
    category: str = Field(min_length=1, max_length=32)
    note: str | None = Field(default=None, max_length=200)
    paid_by: Payer
    op: Op = "upsert"

class SyncExpensesRequest(BaseModel):
    items: list[SyncExpenseItem]
