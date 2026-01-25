import { getApiBaseUrl, getApiKey } from "../config/api";

export interface ApiConfig {
  apiUrl: string;
  apiKey: string;
  headers: HeadersInit;
}

/**
 * API設定を取得（URLとAPIキーの検証を含む）
 */
export function getApiConfig(): ApiConfig {
  const saved = getApiBaseUrl().trim();
  if (!saved) {
    throw new Error("同期先URLを入力してください");
  }

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

  return {
    apiUrl,
    apiKey,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
  };
}

/**
 * HTTPエラーレスポンスを処理
 */
export function handleApiError(res: Response, text: string): never {
  if (res.status === 401) {
    throw new Error("認証に失敗しました。APIキーが正しくないか、QRコードを再読み取りしてください。");
  }
  throw new Error(`HTTP ${res.status}: ${text}`);
}

