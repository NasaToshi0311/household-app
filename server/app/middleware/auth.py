import os
import logging
from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

logger = logging.getLogger(__name__)

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
    "/favicon.ico",  # ブラウザが自動的にリクエストするfavicon
]

class APIKeyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # OPTIONSリクエスト（CORSプリフライト）は認証不要
        if request.method == "OPTIONS":
            return await call_next(request)
        
        # パブリックパスは認証不要
        if any(request.url.path.startswith(path) for path in PUBLIC_PATHS):
            return await call_next(request)
        
        # デバッグ用: リクエスト情報をログ出力
        logger.info(f"認証チェック: {request.method} {request.url.path}")
        
        # APIキーをヘッダーから取得
        api_key = request.headers.get("X-API-Key")
        
        if not api_key:
            logger.warning(f"APIキーなし: {request.method} {request.url.path}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="API key is missing. Please scan QR code to set API key."
            )
        
        if api_key != API_KEY:
            # デバッグ用: 実際のAPIキーはログに出力しない（セキュリティのため）
            logger.warning(f"APIキー不一致: {request.method} {request.url.path}, 期待長: {len(API_KEY)}, 受信長: {len(api_key) if api_key else 0}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid API key. Expected length: {len(API_KEY)}, Received length: {len(api_key) if api_key else 0}"
            )
        
        logger.info(f"認証成功: {request.method} {request.url.path}")
        return await call_next(request)

