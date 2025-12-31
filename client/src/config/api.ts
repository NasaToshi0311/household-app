const LS_KEY = "household_api_base_url";

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
