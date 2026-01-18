import { fetchWithTimeout } from "./fetch.ts";
import type { Expense, PendingExpense } from "../db";
import { getApiBaseUrl, getApiKey } from "../config/api";

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
