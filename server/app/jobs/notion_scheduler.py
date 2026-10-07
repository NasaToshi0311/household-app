# 毎月1日 6:00（日本時間）に先月分のカテゴリ別合計を Notion に送る常駐プロセス
# docker-compose.yml の notion-scheduler サービスとして動かす:
#   python -m app.jobs.notion_scheduler
#
# PCが止まっていて 1日 6:00 を逃した場合は、起動時（またはスリープ復帰後）に
# 「直近の実行予定の対象月」が Notion に1行も無ければ送る。
import logging
import time
from datetime import datetime, timedelta

from app.db import SessionLocal
from app.services.monthly import JST, previous_month
from app.services.notion import NotionError, month_already_synced, sync_month

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("notion_scheduler")

RUN_DAY, RUN_HOUR = 1, 6
RETRY_INTERVAL = timedelta(minutes=30)
MAX_SLEEP_SECONDS = 600  # PCのスリープ等で時計が飛んでも気づけるよう、長くは寝ない


def _latest_due(now: datetime) -> datetime:
    """now 以前で一番新しい「1日 6:00」"""
    candidate = now.replace(day=RUN_DAY, hour=RUN_HOUR, minute=0, second=0, microsecond=0)
    if candidate > now:
        candidate = (candidate - timedelta(days=1)).replace(day=RUN_DAY)
    return candidate


def _next_due(after: datetime) -> datetime:
    first_next_month = (after.replace(day=28) + timedelta(days=4)).replace(day=RUN_DAY)
    return first_next_month.replace(hour=RUN_HOUR, minute=0, second=0, microsecond=0)


def _run(month: str) -> bool:
    db = SessionLocal()
    try:
        sync_month(db, month)
        return True
    except NotionError as e:
        logger.error("Notion 同期に失敗 %s: %s", month, e)
    except Exception:
        logger.exception("Notion 同期で予期しないエラー %s", month)
    finally:
        db.close()
    return False


def main():
    now = datetime.now(JST)
    due = _latest_due(now)
    target = previous_month(due)
    try:
        caught_up = month_already_synced(target)
    except NotionError as e:
        logger.error("Notion の確認に失敗: %s", e)
        caught_up = False

    if caught_up:
        next_at = _next_due(due)
    else:
        logger.info("未送信の %s 分を送ります", target)
        next_at = _next_due(due) if _run(target) else now + RETRY_INTERVAL

    while True:
        logger.info("次回の Notion 同期: %s", next_at.strftime("%Y-%m-%d %H:%M %Z"))
        while (now := datetime.now(JST)) < next_at:
            time.sleep(min((next_at - now).total_seconds(), MAX_SLEEP_SECONDS))

        due = _latest_due(now)
        target = previous_month(due)
        next_at = _next_due(due) if _run(target) else now + RETRY_INTERVAL


if __name__ == "__main__":
    main()
