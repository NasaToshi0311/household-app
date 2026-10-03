import { fetchWithTimeout } from "./fetch.ts";
import type { Expense, PendingExpense, ServerChangeItem } from "../db";
import { getApiConfig, handleApiError } from "../utils/api";

const DEFAULT_TIMEOUT_MS = 15000;
const CHANGES_PAGE_LIMIT = 500;

/**
 * サーバーから差分（since以降に更新・削除されたデータ）を取得
 * sinceを省略すると全件を取得する
 * @returns items: 変更データ / until: 今回の取得範囲の上限時刻（次回のsinceの基準）
 */
export async function fetchChanges(
  since: string | null
): Promise<{ items: ServerChangeItem[]; until: string }> {
  const { apiUrl, headers } = getApiConfig();

  const allItems: ServerChangeItem[] = [];
  let until: string | null = null;
  let offset = 0;

  // ページネーションで全件取得（2ページ目以降は1ページ目のuntilで範囲を固定）
  while (true) {
    const url = new URL(`${apiUrl}/sync/changes`);
    if (since) url.searchParams.set("since", since);
    if (until) url.searchParams.set("until", until);
    url.searchParams.set("limit", CHANGES_PAGE_LIMIT.toString());
    url.searchParams.set("offset", offset.toString());

    const res = await fetchWithTimeout(
      url.toString(),
      { method: "GET", headers },
      DEFAULT_TIMEOUT_MS
    );

    if (!res.ok) {
      const text = await res.text();
      handleApiError(res, text);
    }

    const data: { items: ServerChangeItem[]; until: string } = await res.json();
    until = data.until;
    allItems.push(...data.items);
    offset += CHANGES_PAGE_LIMIT;

    // 取得件数がlimit未満なら最後のページ
    if (data.items.length < CHANGES_PAGE_LIMIT) break;
  }

  return { items: allItems, until: until! };
}

/**
 * Expense型からPendingExpense型に変換（statusとupdated_atを除く）
 */
function toPendingExpense(item: Expense): PendingExpense {
  return {
    client_uuid: item.client_uuid,
    date: item.date,
    amount: item.amount,
    category: item.category,
    note: item.note,
    paid_by: item.paid_by,
    op: item.op,
  };
}

/**
 * 未送信データをサーバーに同期
 */
export async function syncExpenses(items: Expense[]) {
  const { apiUrl, headers } = getApiConfig();
  const payloadItems: PendingExpense[] = items.map(toPendingExpense);

  const res = await fetchWithTimeout(
    `${apiUrl}/sync/expenses`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ items: payloadItems }),
    },
    DEFAULT_TIMEOUT_MS
  );

  if (!res.ok) {
    const text = await res.text();
    handleApiError(res, text);
  }

  return (await res.json()) as { ok_uuids: string[]; ng_uuids: string[] };
}
