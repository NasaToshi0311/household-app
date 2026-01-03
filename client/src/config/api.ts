const LS_KEY = "household_api_base_url";
const LS_API_KEY = "household_api_key";

export function getApiBaseUrl(): string {
  // envのデフォルト（任意）
  const envDefault = import.meta.env.VITE_API_BASE_URL as string | undefined;

  const saved = localStorage.getItem(LS_KEY);
  return (saved ?? envDefault ?? "").trim();
}

export function setApiBaseUrl(url: string) {
  localStorage.setItem(LS_KEY, url.trim());
}

export function clearApiBaseUrl() {
  localStorage.removeItem(LS_KEY);
}

export function getApiKey(): string {
  const saved = localStorage.getItem(LS_API_KEY);
  return saved ?? "";
}

export function setApiKey(key: string) {
  localStorage.setItem(LS_API_KEY, key);
}

export function clearApiKey() {
  localStorage.removeItem(LS_API_KEY);
}
