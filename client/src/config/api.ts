const LS_KEY = "household_api_base_url";
const LS_API_KEY = "household_api_key";
const LS_SETUP_VIA_QR = "setup_via_qr";

/**
 * localStorageに安全にアクセスするヘルパー関数
 */
function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn(`localStorage.getItem failed for ${key}:`, e);
    return null;
  }
}

/**
 * localStorageに安全に書き込むヘルパー関数
 */
function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.error(`localStorage.setItem failed for ${key}:`, e);
    throw new Error("設定の保存に失敗しました。プライベートモードやストレージ容量を確認してください。");
  }
}

/**
 * localStorageから安全に削除するヘルパー関数
 */
function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn(`localStorage.removeItem failed for ${key}:`, e);
  }
}

export function getApiBaseUrl(): string {
  // envのデフォルト（任意）
  const envDefault = import.meta.env.VITE_API_BASE_URL as string | undefined;

  const saved = safeGetItem(LS_KEY);
  return (saved ?? envDefault ?? "").trim();
}

export function setApiBaseUrl(url: string) {
  safeSetItem(LS_KEY, url.trim());
}

export function getApiKey(): string {
  const saved = safeGetItem(LS_API_KEY);
  return saved ?? "";
}

export function setApiKey(key: string) {
  safeSetItem(LS_API_KEY, key);
}

export function setSetupViaQr(value: boolean) {
  safeSetItem(LS_SETUP_VIA_QR, value ? "1" : "0");
}

export function isSetupViaQr(): boolean {
  const saved = safeGetItem(LS_SETUP_VIA_QR);
  return saved === "1";
}

export function clearSetup() {
  safeRemoveItem(LS_KEY);
  safeRemoveItem(LS_API_KEY);
  safeRemoveItem(LS_SETUP_VIA_QR);
}