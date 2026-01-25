import { fetchWithTimeout } from "./fetch.ts";
import type { Expense, PendingExpense } from "../db";
import { getApiBaseUrl, getApiKey } from "../config/api";

export type ServerExpenseItem = {
  id?: number;
  client_uuid?: string;
  date: string;
  amount: number;
  category: string;
  note?: string | null;
  paid_by?: string | null;
};

/**
 * サーバーから直近2か月のデータを取得
 */
export async function fetchRecentExpenses(months: number = 2): Promise<ServerExpenseItem[]> {
  const saved = getApiBaseUrl().trim();
  if (!saved) throw new Error("同期先URLを入力してください");

  let apiUrl: string;
  try {
    const url = new URL(saved);
    apiUrl = url.toString().replace(/\/+$/, "");
  } catch {
    throw new Error("同期先URLが不正です");
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("APIキーが設定されていません。QRコードを読み取って設定してください。");
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "X-API-Key": apiKey,
  };

  // 直近Nか月の開始日と終了日を計算
  const today = new Date();
  const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startDate = new Date(today.getFullYear(), today.getMonth() - months + 1, 1);

  const start = startDate.toISOString().slice(0, 10);
  const end = endDate.toISOString().slice(0, 10);

  const allItems: ServerExpenseItem[] = [];
  let offset = 0;
  const limit = 200; // サーバーの最大limit

  // ページネーションで全件取得
  while (true) {
    const url = new URL(`${apiUrl}/summary/expenses`);
    url.searchParams.set("start", start);
    url.searchParams.set("end", end);
    url.searchParams.set("limit", limit.toString());
    url.searchParams.set("offset", offset.toString());

    const res = await fetchWithTimeout(
      url.toString(),
      {
        method: "GET",
        headers,
      },
      15000
    );

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 401) {
        throw new Error("認証に失敗しました。APIキーが正しくないか、QRコードを再読み取りしてください。");
      }
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    const items: ServerExpenseItem[] = await res.json();
    if (items.length === 0) break;

    allItems.push(...items);
    offset += limit;

    // 取得件数がlimit未満なら最後のページ
    if (items.length < limit) break;
  }

  return allItems;
}

export async function syncExpenses(items: Expense[]) {
  const saved = getApiBaseUrl().trim();
  if (!saved) throw new Error("同期先URLを入力してください");

  let apiUrl: string;
  try {
    const url = new URL(saved);
    // URLインスタンスから末尾のスラッシュを除去して文字列に変換
    apiUrl = url.toString().replace(/\/+$/, "");
  } catch {
    throw new Error("同期先URLが不正です");
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("APIキーが設定されていません。QRコードを読み取って設定してください。");
  }

  const headers: HeadersInit = { 
    "Content-Type": "application/json",
    "X-API-Key": apiKey,
  };

  // タイムアウトを15秒に延長（テザリング環境での遅延を考慮）
  const timeoutMs = 15000;

  // Expense型からPendingExpense型に変換（statusとupdated_atを除く）
  const payloadItems: PendingExpense[] = items.map((item) => ({
    client_uuid: item.client_uuid,
    date: item.date,
    amount: item.amount,
    category: item.category,
    note: item.note,
    paid_by: item.paid_by,
    op: item.op,
  }));

  const res = await fetchWithTimeout(
    `${apiUrl}/sync/expenses`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ items: payloadItems }),
    },
    timeoutMs
  );

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401) {
      throw new Error("認証に失敗しました。APIキーが正しくないか、QRコードを再読み取りしてください。");
    }
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  return (await res.json()) as { ok_uuids: string[]; ng_uuids: string[] };
}
