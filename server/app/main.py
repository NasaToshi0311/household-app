from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db import Base, engine
from app.routers.sync import router as sync_router
from app.routers.expenses import router as expenses_router
from app.routers.stats import router as stats_router
from app.routers.sync_qr import router as sync_qr_router
from app.routers.summary import router as summary_router


app = FastAPI() # FastAPIのインスタンスを作成

origins = [
    "http://10.76.108.202:5173",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 開発用：起動時にテーブル作成（本番はAlembicにする）
Base.metadata.create_all(bind=engine) # テーブルを作成

@app.get("/health") # 健康状態を返すエンドポイント
def health(): # 健康状態を返すエンドポイント
    return {"status": "ok"} # 健康状態を返す

app.include_router(sync_router) # 同期ルーターを追加する
app.include_router(expenses_router) # 支出ルーターを追加する
app.include_router(stats_router) # 統計ルーターを追加する
app.include_router(sync_qr_router) # 同期QRルーターを追加する
app.include_router(summary_router) # 要約ルーターを追加する