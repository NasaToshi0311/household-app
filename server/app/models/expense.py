from sqlalchemy import String, Integer, Date, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db import Base

class Expense(Base): # 支出モデル   SQLAlchemyのモデルクラス
    __tablename__ = "expenses" # テーブル名

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True) # 主キー
    client_uuid: Mapped[str] = mapped_column(String(36), unique=True, index=True, nullable=False) # クライアントUUID
    date: Mapped[str] = mapped_column(Date, nullable=False) # 日付
    amount: Mapped[int] = mapped_column(Integer, nullable=False) # 金額
    category: Mapped[str] = mapped_column(String(32), nullable=False) # カテゴリ
    note: Mapped[str | None] = mapped_column(String(200), nullable=True) # 備考
    paid_by: Mapped[str] = mapped_column(String(8), nullable=False)  # 支払者（"me" or "her"）
    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False) # 作成日時（現在時刻）
    updated_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False) # 更新日時（現在時刻）
