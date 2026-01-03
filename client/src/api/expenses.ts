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

  // タイムアウトを15秒に延長（テザリング環境での遅延を考慮）
  const timeoutMs = 15000;

  // デバッグ用: リクエスト情報をログ出力
  console.log("同期リクエスト送信:", {
    url: `${api}/sync/expenses`,
    itemsCount: items.length,
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey.length,
  });

  const res = await fetchWithTimeout(
    `${api}/sync/expenses`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ items }),
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
