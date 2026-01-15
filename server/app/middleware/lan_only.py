# app/middleware/lan_only.py
import os
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

class LanOnlyMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, allow_subnets: str, protected_prefixes=("/sync",)):
        super().__init__(app)
        self.allow_nets = _parse_networks(allow_subnets)
        self.protected_prefixes = protected_prefixes

    async def dispatch(self, request, call_next):
        # /sync だけ守る（必要なら増やす）
        if not request.url.path.startswith(self.protected_prefixes):
            return await call_next(request)

        # 許可サブネットが未設定なら安全側で拒否（好みで変更OK）
        if not self.allow_nets:
            return JSONResponse({"detail": "LAN restriction is not configured"}, status_code=403)

        # 直接アクセスの送信元IP
        client_ip = request.client.host
        ip = ipaddress.ip_address(client_ip)

        if any(ip in net for net in self.allow_nets):
            return await call_next(request)

        return JSONResponse({"detail": "LAN only"}, status_code=403)
