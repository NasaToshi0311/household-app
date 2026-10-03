import { applyServerChanges, getMeta, getPendingExpenses, markSynced, removeSyncedNotIn, setMeta } from "./db";
import { fetchChanges, syncExpenses } from "./api/expenses";

const CURSOR_KEY = "sync_cursor";
const LAST_SYNCED_KEY = "last_synced_at";
// 取りこぼし防止のため、前回の取得範囲と少し重ねて取得する（重複は内容比較で無視される）
const CURSOR_OVERLAP_MS = 5 * 60 * 1000;

export type SyncResult = {
  sent: number; // 送信成功
  failed: number; // 送信失敗
  received: number; // サーバーから追加・更新されたデータ
  removed: number; // サーバー側で削除されていたためローカルから消したデータ
  fullFetch: boolean; // 全件取得だったか
};

/**
 * 同期処理
 * 1. 未送信データをサーバーへ送信
 * 2. 前回同期以降の変更（他の端末での追加・編集・削除）をサーバーから取得して反映
 *    初回（または全件再取得時）は全期間のデータを取得する
 */
export async function runSync(): Promise<SyncResult> {
  let sent = 0;
  let failed = 0;

  const pending = await getPendingExpenses();
  if (pending.length > 0) {
    const result = await syncExpenses(pending);
    await markSynced(pending, result.ok_uuids);
    sent = result.ok_uuids.length;
    failed = result.ng_uuids.length;
  }

  const since = await getMeta(CURSOR_KEY);
  const { items, until } = await fetchChanges(since);
  const applied = await applyServerChanges(items);

  let removed = applied.deleted;
  if (!since) {
    // 全件取得時は、サーバーに存在しないローカルの同期済みデータも掃除する
    removed += await removeSyncedNotIn(new Set(items.map((i) => i.client_uuid)));
  }

  await setMeta(CURSOR_KEY, new Date(new Date(until).getTime() - CURSOR_OVERLAP_MS).toISOString());
  await setMeta(LAST_SYNCED_KEY, new Date().toISOString());

  return { sent, failed, received: applied.updated, removed, fullFetch: !since };
}

/**
 * 次回の同期で全期間のデータを取り直すようにする
 */
export async function resetSyncCursor(): Promise<void> {
  await setMeta(CURSOR_KEY, null);
}

/**
 * 最終同期日時（ISO文字列）。未同期ならnull
 */
export function getLastSyncedAt(): Promise<string | null> {
  return getMeta(LAST_SYNCED_KEY);
}
