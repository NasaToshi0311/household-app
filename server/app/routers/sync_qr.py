import socket
import qrcode
from io import BytesIO
from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse, StreamingResponse

router = APIRouter(prefix="/sync", tags=["sync-qr"])

def get_lan_ip() -> str:
    # 8.8.8.8に実際に接続しなくても、経路からLAN側IPを取れる
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM) # ソケットを作成   
    try:
        s.connect(("8.8.8.8", 80)) # 8.8.8.8に接続
        return s.getsockname()[0] # ソケットの名前を取得
    except (socket.error, OSError) as e:
        raise HTTPException(status_code=503, detail=f"Failed to get LAN IP address: {e}")
    finally:
        s.close() # ソケットをクローズ

@router.get("/url")
def sync_url():
    try:
        ip = get_lan_ip()
        return {"base_url": f"http://{ip}:8000?from=qr"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")

@router.get("/qr.png")
def sync_qr_png():
    try:
        ip = get_lan_ip()
        url = f"http://{ip}:8000?from=qr"

        img = qrcode.make(url)
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
