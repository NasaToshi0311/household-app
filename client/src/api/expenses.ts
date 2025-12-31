import { fetchWithTimeout } from "./fetch.ts";
import type { PendingExpense } from "../db";
import { getApiBaseUrl } from "../config/api";

export async function syncExpenses(items: PendingExpense[]) {
  const saved = getApiBaseUrl().trim();
  if (!saved) throw new Error("同期先URLを入力してください");

  let api: string;
  try {
    api = new URL(saved).toString().replace(/\/+$/, "");
  } catch {
    throw new Error("同期先URLが不正です");
  }

  const res = await fetchWithTimeout(
    `${api}/sync/expenses`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    },
    8000
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  return res.json() as Promise<{ ok_uuids: string[]; ng_uuids: string[] }>;
}
