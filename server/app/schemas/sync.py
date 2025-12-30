from datetime import date
from pydantic import BaseModel, Field
from typing import Literal

Payer = Literal["me", "her"] # 支払者（"me" or "her"）

class SyncExpenseItem(BaseModel): # 支出項目
    client_uuid: str = Field(min_length=10) # クライアントUUID
    date: date # 日付
    amount: int = Field(ge=0) # 金額
    category: str = Field(min_length=1, max_length=32) # カテゴリ
    note: str | None = Field(default=None, max_length=200) # 備考
    paid_by: Payer # 支払者

class SyncExpensesRequest(BaseModel): # 支出リクエスト
    items: list[SyncExpenseItem] # 支出項目リスト
