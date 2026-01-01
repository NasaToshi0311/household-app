from datetime import date
from pydantic import BaseModel, Field, field_validator
from typing import Literal

Payer = Literal["me", "her"]
Op = Literal["upsert", "delete"]

class SyncExpenseItem(BaseModel):
    client_uuid: str = Field(min_length=10)
    date: date
    amount: int = Field(ge=0, le=1000000000)  # 0円以上、10億円以下
    category: str = Field(min_length=1, max_length=32)
    note: str | None = Field(default=None, max_length=200)
    paid_by: Payer
    op: Op = "upsert"

class SyncExpensesRequest(BaseModel):
    items: list[SyncExpenseItem]
    
    @field_validator("items")
    @classmethod
    def validate_items_length(cls, v):
        if len(v) > 1000:
            raise ValueError("Maximum 1000 items allowed per request")
        return v
