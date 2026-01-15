# app/middleware/lan_only.py
import ipaddress
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

def _parse_networks(value: str):
    nets = []
    for part in (value or "").split(","):
        part = part.strip()
        if not part:
            continue
        nets.append(ipaddress.ip_network(part, strict=False))
    return nets

def _get_client_ip(request) -> str:
    """
    できるだけ「本当のクライアントIP」を取る。
    - まず X-Forwarded-For（先頭が元IP）を見る
    - 次に X-Real-IP
    - 最後に request.client.host
    """
    xff = request.headers.get("x-forwarded-for")
    if xff:
        # "client, proxy1, proxy2" の形式。先頭が元IP
        return xff.split(",")[0].strip()

    xri = request.headers.get("x-real-ip")
    if xri:
        return xri.strip()

    return request.client.host

class LanOnlyMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, allow_subnets: str, protected_prefixes=("/sync",), allow_loopback: bool = True):
        super().__init__(app)
        self.allow_nets = _parse_networks(allow_subnets)
        self.protected_prefixes = protected_prefixes
        self.allow_loopback = allow_loopback

    async def dispatch(self, request, call_next):
        # /sync 配下だけ守る
        if not request.url.path.startswith(self.protected_prefixes):
            return await call_next(request)

        if not self.allow_nets:
            return JSONResponse({"detail": "LAN restriction is not configured"}, status_code=403)

        client_ip_str = _get_client_ip(request)

        # たまに "unknown" とか来るケースもあるので安全側
        try:
            client_ip = ipaddress.ip_address(client_ip_str)
        except ValueError:
            return JSONResponse({"detail": f"LAN only (invalid ip: {client_ip_str})"}, status_code=403)

        # 開発用：127.0.0.1 等は許可
        if self.allow_loopback and client_ip.is_loopback:
            return await call_next(request)

        if any(client_ip in net for net in self.allow_nets):
            return await call_next(request)

        return JSONResponse({"detail": "LAN only"}, status_code=403)
