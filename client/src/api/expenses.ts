import { fetchWithTimeout } from "./fetch.ts";
import type { PendingExpense } from "../db";
import { getApiBaseUrl, getApiKey } from "../config/api";

export async function syncExpenses(items: PendingExpense[]) {
  const saved = getApiBaseUrl().trim();
  if (!saved) throw new Error("同期先URLを入力してください");

  let api: string;
  try {
    api = new URL(saved).toString().replace(/\/+$/, "");
  } catch {
    throw new Error("同期先URLが不正です");
  }

  const apiKey = getApiKey();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  }

  const res = await fetchWithTimeout(
    `${api}/sync/expenses`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ items }),
    },
    8000
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  return (await res.json()) as { ok_uuids: string[]; ng_uuids: string[] };
}
