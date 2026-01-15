import socket
import qrcode
import os
from urllib.parse import quote
from io import BytesIO
from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse, StreamingResponse

router = APIRouter(prefix="/sync", tags=["sync-qr"])

API_KEY = os.environ.get("API_KEY", "household-app-secret-key-2024")

# VercelのフロントURL（環境変数で変えられるように）
FRONTEND_URL = os.environ.get("FRONTEND_URL", "https://household-app.vercel.app")

def get_lan_ip() -> str:
    # 推奨：docker-compose.yml で HOST_IP=192.168.0.34 を固定
    env_ip = os.environ.get("HOST_IP")
    if env_ip:
        return env_ip.strip()

    # フォールバック（Docker内だと172.xxになることがある）
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        if ip.startswith("172.17.") or ip.startswith("172.18."):
            raise HTTPException(
                status_code=503,
                detail=(
                    f"Docker内部IP ({ip}) が取得されました。"
                    f"docker-compose.yml の environment に HOST_IP=あなたのPCのIP を追加してください。"
                    f"例: HOST_IP=192.168.0.34"
                )
            )
        return ip
    except HTTPException:
        raise
    except (socket.error, OSError) as e:
        raise HTTPException(status_code=503, detail=f"Failed to get LAN IP address: {e}")
    finally:
        s.close()

@router.get("/url")
def sync_url():
    ip = get_lan_ip()
    base_url = f"http://{ip}:8000"
    return {
        "base_url": base_url,
        "api_key": API_KEY,
    }

@router.get("/qr.png")
def sync_qr_png():
    ip = get_lan_ip()
    base_url = f"http://{ip}:8000"

    # スマホ（ブラウザ）が直接叩く用のURL（LAN内限定でOK）
    sync_url = f"{base_url}/sync/url"

    # Vercelに渡す：sync_url と base_url（フロントで保存用）
    # 重要：Vercel側は “ブラウザで” sync_url を fetch すること（SSRはNG）
    qr_url = (
        f"{FRONTEND_URL}/sync-setup"
        f"?sync_url={quote(sync_url)}"
        f"&base_url={quote(base_url)}"
    )

    img = qrcode.make(qr_url)
    buf = BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png")

@router.get("/page")
def sync_page():
    # PCで開いて、彼女のスマホでカメラ読み取りする想定
    html = f"""
    <!doctype html>
    <html lang="ja">
    <head><meta charset="utf-8"><title>同期QR</title></head>
    <body style="font-family: sans-serif; padding: 24px;">
      <h1>同期用QR</h1>
      <p>スマホのカメラで読み取ってください（家Wi-Fi接続中のみ同期できます）。</p>
      <img src="/sync/qr.png" style="width: 320px; height: 320px;" />
      <p>確認用: <a href="/sync/url" target="_blank">/sync/url</a></p>
    </body>
    </html>
    """
    return HTMLResponse(html)
