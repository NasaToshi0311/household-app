# Notion への月次カテゴリ別集計の送信
# - 送り先は Notion の data source（Notion-Version 2026-03-11）
# - 送るのはカテゴリ別の合計金額と件数だけ（明細・メモは送らない）
# - トークンはログ・エラーメッセージに出さない
import json
import logging
import os
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field

from sqlalchemy.orm import Session

from app.services.monthly import category_totals, month_range

logger = logging.getLogger(__name__)

NOTION_API = "https://api.notion.com/v1"
NOTION_VERSION = "2026-03-11"

# Notion データベースのプロパティ名
PROP_NAME = "名前"       # タイトル
PROP_MONTH = "月"        # テキスト
PROP_CATEGORY = "カテゴリ"  # テキスト
PROP_AMOUNT = "金額"     # 数値
PROP_COUNT = "件数"      # 数値


class NotionError(Exception):
    """Notion API のエラー。メッセージにトークンは含めない"""
    def __init__(self, message: str, status: int | None = None):
        super().__init__(message)
        self.status = status


def _config() -> tuple[str, str]:
    token = os.environ.get("NOTION_TOKEN", "").strip()
    data_source_id = os.environ.get("NOTION_DATA_SOURCE_ID", "").strip()
    if not token or not data_source_id:
        raise NotionError("NOTION_TOKEN / NOTION_DATA_SOURCE_ID が設定されていません")
    return token, data_source_id


def _request(token: str, method: str, path: str, body: dict, retries: int = 3) -> dict:
    data = json.dumps(body).encode("utf-8")
    for attempt in range(retries + 1):
        req = urllib.request.Request(
            f"{NOTION_API}{path}",
            data=data,
            method=method,
            headers={
                "Authorization": f"Bearer {token}",
                "Notion-Version": NOTION_VERSION,
                "Content-Type": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                return json.loads(res.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            # レート制限・一時的なエラーは待って再試行
            if e.code in (429, 500, 502, 503, 504) and attempt < retries:
                wait = float(e.headers.get("Retry-After") or 2 ** attempt)
                time.sleep(min(wait, 30))
                continue
            # Notion のエラー本文（code / message）だけを返す。リクエストヘッダーは出さない
            try:
                err = json.loads(e.read().decode("utf-8"))
                detail = f"{err.get('code')}: {err.get('message')}"
            except Exception:
                detail = e.reason
            raise NotionError(f"Notion API {method} {path.split('/')[1]} failed ({e.code}) {detail}", status=e.code) from None
        except urllib.error.URLError as e:
            if attempt < retries:
                time.sleep(2 ** attempt)
                continue
            raise NotionError(f"Notion API に接続できません: {e.reason}") from None
    raise NotionError("Notion API の再試行回数を超えました")


def _text(value: str) -> list[dict]:
    return [{"type": "text", "text": {"content": value}}]


def _properties(month: str, category: str, total: int, count: int) -> dict:
    return {
        PROP_NAME: {"title": _text(f"{month} {category}")},
        PROP_MONTH: {"rich_text": _text(month)},
        PROP_CATEGORY: {"rich_text": _text(category)},
        PROP_AMOUNT: {"number": total},
        PROP_COUNT: {"number": count},
    }


def _plain_text(prop: dict | None) -> str:
    if not prop:
        return ""
    items = prop.get("rich_text") or prop.get("title") or []
    return "".join(i.get("plain_text", "") for i in items)


def _pages_for_month(token: str, data_source_id: str, month: str) -> list[dict]:
    """「月」が一致するページを全件取得（ゴミ箱のものは含まない）"""
    pages: list[dict] = []
    body: dict = {
        "filter": {"property": PROP_MONTH, "rich_text": {"equals": month}},
        "page_size": 100,
    }
    while True:
        res = _request(token, "POST", f"/data_sources/{data_source_id}/query", body)
        pages.extend(p for p in res.get("results", []) if p.get("object") == "page" and not p.get("in_trash"))
        if not res.get("has_more"):
            return pages
        body["start_cursor"] = res["next_cursor"]


def month_already_synced(month: str) -> bool:
    """Notion にその月の行が1件でもあれば True"""
    token, data_source_id = _config()
    return len(_pages_for_month(token, data_source_id, month)) > 0


@dataclass
class SyncResult:
    month: str
    created: list[str] = field(default_factory=list)
    updated: list[str] = field(default_factory=list)
    zeroed: list[str] = field(default_factory=list)      # Notionにはあるが今は支出がないカテゴリ（0に更新）
    duplicates: list[str] = field(default_factory=list)  # Notion側に同じ月・カテゴリが複数あったもの


def sync_month(db: Session, month: str) -> SyncResult:
    """指定月のカテゴリ別合計・件数を Notion に upsert する（同じ月・カテゴリは更新）"""
    month_range(month)  # 形式チェック
    token, data_source_id = _config()
    totals = category_totals(db, month)

    # 既存行を「カテゴリ → ページ」で引けるようにする
    existing: dict[str, dict] = {}
    result = SyncResult(month=month)
    for page in _pages_for_month(token, data_source_id, month):
        category = _plain_text(page.get("properties", {}).get(PROP_CATEGORY))
        if category in existing:
            if category not in result.duplicates:
                result.duplicates.append(category)
            continue
        existing[category] = page

    for item in totals:
        props = _properties(month, item.category, item.total, item.count)
        page = existing.pop(item.category, None)
        if page:
            _request(token, "PATCH", f"/pages/{page['id']}", {"properties": props})
            result.updated.append(item.category)
        else:
            _request(token, "POST", "/pages", {
                "parent": {"type": "data_source_id", "data_source_id": data_source_id},
                "properties": props,
            })
            result.created.append(item.category)

    # 支出が全て削除されたカテゴリは、行を残したまま 0 にする
    for category, page in existing.items():
        if not category:
            continue
        _request(token, "PATCH", f"/pages/{page['id']}", {"properties": _properties(month, category, 0, 0)})
        result.zeroed.append(category)

    if result.duplicates:
        logger.warning("Notion に同じ月・カテゴリの行が複数あります: %s %s", month, result.duplicates)
    logger.info(
        "Notion 同期完了 %s: 作成 %d / 更新 %d / 0更新 %d",
        month, len(result.created), len(result.updated), len(result.zeroed),
    )
    return result
