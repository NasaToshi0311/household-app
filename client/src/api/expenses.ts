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
  if (!apiKey) {
    throw new Error("APIキーが設定されていません。QRコードを読み取って設定してください。");
  }

  const headers: HeadersInit = { 
    "Content-Type": "application/json",
    "X-API-Key": apiKey,
  };

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
    if (res.status === 401) {
      throw new Error("認証に失敗しました。APIキーが正しくないか、QRコードを再読み取りしてください。");
    }
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  return (await res.json()) as { ok_uuids: string[]; ng_uuids: string[] };
}
