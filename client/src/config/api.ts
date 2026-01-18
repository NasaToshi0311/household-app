const LS_KEY = "household_api_base_url";
const LS_API_KEY = "household_api_key";
const LS_SETUP_VIA_QR = "setup_via_qr";

export function getApiBaseUrl(): string {
  // envのデフォルト（任意）
  const envDefault = import.meta.env.VITE_API_BASE_URL as string | undefined;

  const saved = localStorage.getItem(LS_KEY);
  return (saved ?? envDefault ?? "").trim();
}

export function setApiBaseUrl(url: string) {
  localStorage.setItem(LS_KEY, url.trim());
}

export function getApiKey(): string {
  const saved = localStorage.getItem(LS_API_KEY);
  return saved ?? "";
}

export function setApiKey(key: string) {
  localStorage.setItem(LS_API_KEY, key);
}

export function setSetupViaQr(value: boolean) {
  localStorage.setItem(LS_SETUP_VIA_QR, value ? "1" : "0");
}

export function isSetupViaQr(): boolean {
  const saved = localStorage.getItem(LS_SETUP_VIA_QR);
  return saved === "1";
}

export function clearSetup() {
  localStorage.removeItem(LS_KEY);
  localStorage.removeItem(LS_API_KEY);
  localStorage.removeItem(LS_SETUP_VIA_QR);
}