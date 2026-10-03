# app/middleware/lan_only.py
import ipaddress
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

# プロキシ（Tailscale Funnel 等）を経由したリクエストに付くヘッダー
PROXY_HEADERS = (
    "x-forwarded-for",
    "x-forwarded-host",
    "x-forwarded-proto",
    "x-real-ip",
    "forwarded",
    "tailscale-funnel-request",
)

def _parse_networks(value: str):
    nets = []
    for part in (value or "").split(","):
        part = part.strip()
        if not part:
            continue
        nets.append(ipaddress.ip_network(part, strict=False))
    return nets

def _is_proxied(request) -> bool:
    """
    インターネット側からプロキシ経由で届いたリクエストかどうか。
    X-Forwarded-For 等はクライアントが偽装できるため、IPの判定には使わず
    「付いていたら外部からのアクセスとみなして拒否する」安全側の判定にだけ使う。
    """
    if any(h in request.headers for h in PROXY_HEADERS):
        return True
    host = request.headers.get("host", "").split(":")[0].lower()
    return host.endswith(".ts.net")

class LanOnlyMiddleware(BaseHTTPMiddleware):
    """
    指定したパス（APIキーを発行するQR関連ページ）を、家のLANとPC本体からのアクセスに限定する。
    allow_subnets が空でも、プロキシ経由（外部）のアクセスは常に拒否する。
    """
    def __init__(self, app, allow_subnets: str, protected_prefixes=("/sync",), allow_loopback: bool = True):
        super().__init__(app)
        self.allow_nets = _parse_networks(allow_subnets)
        self.protected_prefixes = protected_prefixes
        self.allow_loopback = allow_loopback

    async def dispatch(self, request, call_next):
        if not request.url.path.startswith(self.protected_prefixes):
            return await call_next(request)

        if _is_proxied(request):
            return JSONResponse({"detail": "LAN only"}, status_code=403)

        if not self.allow_nets:
            return await call_next(request)

        client_host = request.client.host if request.client else ""
        try:
            client_ip = ipaddress.ip_address(client_host)
        except ValueError:
            return JSONResponse({"detail": f"LAN only (invalid ip: {client_host})"}, status_code=403)

        # 開発用：127.0.0.1 等は許可
        if self.allow_loopback and client_ip.is_loopback:
            return await call_next(request)

        if any(client_ip in net for net in self.allow_nets):
            return await call_next(request)

        return JSONResponse({"detail": "LAN only"}, status_code=403)
