import os
from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

# APIキーを環境変数から読み込む（デフォルト値あり）
API_KEY = os.environ.get("API_KEY", "household-app-secret-key-2024")

# 認証不要なパス
PUBLIC_PATHS = [
    "/health",
    "/docs",
    "/openapi.json",
    "/sync/page",
    "/sync/qr.png",
    "/sync/url",
    "/app",
]

class APIKeyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # パブリックパスは認証不要
        if any(request.url.path.startswith(path) for path in PUBLIC_PATHS):
            return await call_next(request)
        
        # APIキーをヘッダーから取得
        api_key = request.headers.get("X-API-Key")
        
        if not api_key or api_key != API_KEY:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or missing API key"
            )
        
        return await call_next(request)

