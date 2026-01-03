import socket
import qrcode
import json
import os
from urllib.parse import quote
from io import BytesIO
from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse, StreamingResponse

router = APIRouter(prefix="/sync", tags=["sync-qr"])

# APIキーを環境変数から読み込む（デフォルト値あり）
API_KEY = os.environ.get("API_KEY", "household-app-secret-key-2024")

def get_lan_ip() -> str:
    # 環境変数でIPアドレスが指定されている場合はそれを使用（推奨）
    env_ip = os.environ.get("HOST_IP")
    if env_ip:
        return env_ip.strip()
    
    # フォールバック: 従来の方法（Dockerコンテナ内では内部IPを返す可能性がある）
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        # Dockerコンテナの内部IP（172.17.x.x, 172.18.x.xなど）の場合は警告
        if ip.startswith('172.17.') or ip.startswith('172.18.'):
            raise HTTPException(
                status_code=503,
                detail=f"Dockerコンテナの内部IP ({ip}) が取得されました。docker-compose.yml の environment に HOST_IP=あなたのPCのIPアドレス を追加してください。例: HOST_IP=192.168.1.100"
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
    try:
        ip = get_lan_ip()
        base_url = f"http://{ip}:8000"
        # URLとAPIキーの両方を返す
        return {
            "base_url": base_url,
            "api_key": API_KEY,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")

@router.get("/qr.png")
def sync_qr_png():
    try:
        ip = get_lan_ip()
        base_url = f"http://{ip}:8000"
        # QRコードにアプリのURLとJSONデータを含める
        # スマホで読み取った後、アプリが開くようにする
        qr_data = {
            "base_url": base_url,
            "api_key": API_KEY,
        }
        # JSONをURLエンコードしてアプリのURLに含める
        app_url = "https://household-app.vercel.app"
        qr_json = json.dumps(qr_data)
        qr_url = f"{app_url}?qr_data={quote(qr_json)}"

        img = qrcode.make(qr_url)
        buf = BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        return StreamingResponse(buf, media_type="image/png")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate QR code: {e}")

@router.get("/page") # 同期ページを取得するエンドポイント
def sync_page(): # 同期ページを取得するエンドポイント
    # PCで開いて、彼女のスマホでカメラ読み取りする想定
    html = """
    <!doctype html>
    <html lang="ja">
    <head><meta charset="utf-8"><title>同期QR</title></head>
    <body style="font-family: sans-serif; padding: 24px;">
      <h1>同期用QR</h1>
      <p>スマホのカメラで読み取ってください。</p>
      <img src="/sync/qr.png" style="width: 320px; height: 320px;" />
      <p>URL: <a href="/sync/url" target="_blank">/sync/url</a></p>
    </body>
    </html>
    """
    return HTMLResponse(html) # HTMLResponseを返す 
