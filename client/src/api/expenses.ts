import { fetchWithTimeout } from "./fetch.ts";
import type { Expense, PendingExpense } from "../db";
import { getApiConfig, handleApiError } from "../utils/api";
import { getRecentMonthsRange } from "../utils/date";

export type ServerExpenseItem = {
  id?: number;
  client_uuid?: string;
  date: string;
  amount: number;
  category: string;
  note?: string | null;
  paid_by?: string | null;
};

const DEFAULT_TIMEOUT_MS = 15000;
const MAX_PAGE_LIMIT = 200;

/**
 * サーバーから直近Nか月のデータを取得
 */
export async function fetchRecentExpenses(months: number = 2): Promise<ServerExpenseItem[]> {
  const { apiUrl, headers } = getApiConfig();
  const { start, end } = getRecentMonthsRange(months);

  const allItems: ServerExpenseItem[] = [];
  let offset = 0;

  // ページネーションで全件取得
  while (true) {
    const url = new URL(`${apiUrl}/summary/expenses`);
    url.searchParams.set("start", start);
    url.searchParams.set("end", end);
    url.searchParams.set("limit", MAX_PAGE_LIMIT.toString());
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

    const items: ServerExpenseItem[] = await res.json();
    if (items.length === 0) break;

    allItems.push(...items);
    offset += MAX_PAGE_LIMIT;

    // 取得件数がlimit未満なら最後のページ
    if (items.length < MAX_PAGE_LIMIT) break;
  }

  return allItems;
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
