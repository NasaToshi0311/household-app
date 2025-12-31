import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

DATABASE_URL = os.environ["DATABASE_URL"] # データベース接続URLを環境変数から取得

engine = create_engine(DATABASE_URL, pool_pre_ping=True) # データベースエンジンを作成
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False) # セッションメーカーを作成

class Base(DeclarativeBase): # ベースクラスを作成
    pass # ベースクラスは空のまま

def get_db(): # セッションを取得する関数
    db = SessionLocal() # セッションを作成
    try:
        yield db # セッションを返す
    except Exception:
        db.rollback() # エラー時はロールバック
        raise
    finally:
        db.close() # セッションをクローズ
