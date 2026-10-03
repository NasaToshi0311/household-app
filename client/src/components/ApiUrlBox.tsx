import { useEffect, useState, useRef } from "react";
import { getApiBaseUrl, setApiBaseUrl, setApiKey, getApiKey, setSetupViaQr, isSetupViaQr } from "../config/api";
import { formatDateTimeLabel } from "../utils/date";
import * as S from "../ui/styles";

type Props = {
  itemsCount: number;
  online: boolean;
  syncing: boolean;
  lastSyncedAt: string | null;
  onSync: () => void;
  onConfiguredChange?: () => void;
  isOpen: boolean;
};

export default function ApiUrlBox({
  itemsCount,
  online,
  syncing,
  lastSyncedAt,
  onSync,
  onConfiguredChange,
  isOpen,
}: Props) {
  const [setupError, setSetupError] = useState<string | null>(null);
  const [setupSuccess, setSetupSuccess] = useState<string | null>(null);
  const [legacySyncUrl, setLegacySyncUrl] = useState<string | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);
  // StrictModeでeffectが2回走っても設定処理が重複しないようにrefでガード
  const settingUpRef = useRef(false);

  const onConfiguredChangeRef = useRef(onConfiguredChange);

  useEffect(() => {
    onConfiguredChangeRef.current = onConfiguredChange;
  }, [onConfiguredChange]);

  function removeUrlParams(paramsToRemove: string[]) {
    const newUrl = new URL(window.location.href);
    paramsToRemove.forEach((param) => newUrl.searchParams.delete(param));
    window.history.replaceState(null, "", newUrl.toString());
  }

  /**
   * URLの形式を検証（http / https のみ許可）
   */
  function validateUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  /**
   * サーバーへの接続をテスト
   */
  async function testConnection(baseUrl: string, apiKey: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${baseUrl}/health`, {
        method: "GET",
        headers: { "X-API-Key": apiKey },
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * 設定を保存する共通処理
   */
  async function saveConfiguration(baseUrl: string, apiKey: string): Promise<boolean> {
    if (!validateUrl(baseUrl)) {
      setSetupError(`無効なURL形式です: ${baseUrl}`);
      return false;
    }

    if (!apiKey.trim()) {
      setSetupError("APIキーが空です");
      return false;
    }

    try {
      setApiBaseUrl(baseUrl);
      setApiKey(apiKey);
      setSetupViaQr(true);
    } catch (e: any) {
      setSetupError(e?.message ?? "設定の保存に失敗しました");
      return false;
    }

    // 保存できたか確認（プライベートモード等で保存されないことがある）
    if (getApiBaseUrl() !== baseUrl.trim() || getApiKey() !== apiKey || !isSetupViaQr()) {
      setSetupError("設定の保存に失敗しました。プライベートモードになっていないか確認してください。");
      return false;
    }

    // 接続テストに失敗しても設定は保存済み（同じWi-Fiにいない場合など）なので警告のみ
    if (!(await testConnection(baseUrl, apiKey))) {
      console.warn("[ApiUrlBox] Connection test failed, but settings are saved");
    }
    return true;
  }

  /**
   * 設定処理を実行し、成功したらページを再読み込みする
   */
  async function runSetup(task: () => Promise<boolean>, paramsToRemove: string[]) {
    if (settingUpRef.current) return;
    settingUpRef.current = true;
    setIsSettingUp(true);
    setSetupError(null);
    setSetupSuccess(null);

    try {
      if (await task()) {
        setSetupSuccess("設定が完了しました！ページを再読み込みします...");
        removeUrlParams(paramsToRemove);
        onConfiguredChangeRef.current?.();
        setTimeout(() => window.location.reload(), 800);
      }
    } finally {
      settingUpRef.current = false;
      setIsSettingUp(false);
    }
  }

  /**
   * 新方式: QRコードのURLに含まれる base_url と api_key で設定
   */
  function setupFromParams(baseUrl: string, apiKey: string) {
    return runSetup(
      () => saveConfiguration(decodeURIComponent(baseUrl), decodeURIComponent(apiKey)),
      ["base_url", "api_key"]
    );
  }

  /**
   * 旧方式: sync_url から設定情報を取得して設定（後方互換性のため）
   */
  function setupFromSyncUrl(syncUrl: string) {
    return runSetup(async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(syncUrl, { cache: "no-store", signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          setSetupError(`サーバーエラー: ${response.status} ${response.statusText}`);
          return false;
        }

        const data = await response.json();
        const baseUrl = data.base_url ? String(data.base_url).replace(/\/+$/, "") : "";
        const apiKey = data.api_key ? String(data.api_key) : "";
        if (!baseUrl || !apiKey) {
          setSetupError("サーバーから設定情報を取得できませんでした");
          return false;
        }
        return saveConfiguration(baseUrl, apiKey);
      } catch (error: any) {
        setSetupError(
          error?.name === "AbortError"
            ? "タイムアウト: サーバーへの接続に時間がかかりすぎています"
            : "PCと同じWi-Fiに接続されているか確認してください"
        );
        return false;
      }
    }, ["sync_url"]);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const baseUrlParam = params.get("base_url");
    const apiKeyParam = params.get("api_key");
    const syncUrlRaw = params.get("sync_url");

    // 新方式を優先（base_url と api_key が直接含まれている場合）
    if (baseUrlParam && apiKeyParam) {
      setupFromParams(baseUrlParam, apiKeyParam);
      return;
    }

    // 旧方式: sync_url から取得
    if (syncUrlRaw) {
      const syncUrl = decodeURIComponent(syncUrlRaw);
      setLegacySyncUrl(syncUrl);
      setupFromSyncUrl(syncUrl);
      return;
    }

    // 既存設定の反映
    onConfiguredChangeRef.current?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentApiBaseUrl = getApiBaseUrl().trim();
  const configured = !!currentApiBaseUrl && !!getApiKey().trim();
  const canSync = online && !syncing && configured;
  const hasPending = itemsCount > 0;

  const params = new URLSearchParams(window.location.search);
  const qrBaseUrl = params.get("base_url");
  const qrApiKey = params.get("api_key");

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: "#4b5563", lineHeight: 1.5 }}>
          {!online ? (
            <span style={{ color: "#b45309", fontWeight: 600 }}>オフライン（入力は保存されます）</span>
          ) : (
            <span style={{ fontWeight: 600, color: hasPending ? "#b45309" : "#4b5563" }}>
              未送信 {itemsCount}件
            </span>
          )}
          <div style={{ fontSize: 12, color: "#9ca3af" }}>
            {lastSyncedAt ? `最終同期 ${formatDateTimeLabel(lastSyncedAt)}` : "まだ同期していません"}
          </div>
        </div>
        <button
          onClick={onSync}
          disabled={!canSync}
          style={{
            ...(canSync && hasPending ? S.btnPrimary : S.btn),
            flexShrink: 0,
            padding: "10px 18px",
            opacity: canSync ? 1 : 0.6,
            cursor: canSync ? "pointer" : "not-allowed",
          }}
        >
          {syncing ? "同期中..." : !configured ? "QRで設定してください" : "同期する"}
        </button>
      </div>

      {isOpen && configured && (
        <div style={{
          marginTop: 12,
          padding: 12,
          background: "#f0fdf4",
          borderRadius: 8,
          border: "1px solid #86efac",
          fontSize: 12
        }}>
          <div style={{ fontWeight: 600, marginBottom: 8, color: "#166534" }}>
            ✓ 現在の設定
          </div>
          <div style={{ color: "#15803d", marginBottom: 4, overflowWrap: "anywhere" }}>
            API URL: <span style={{ fontFamily: "monospace" }}>{currentApiBaseUrl}</span>
          </div>
          <div style={{ color: "#15803d" }}>
            API Key: <span style={{ fontFamily: "monospace" }}>***</span>
          </div>
          {isSetupViaQr() && (
            <div style={{ marginTop: 8, fontSize: 11, color: "#059669" }}>
              QRコードで設定済み
            </div>
          )}
        </div>
      )}

      {setupSuccess && (
        <div style={{
          marginTop: 12,
          padding: 12,
          background: "#d1fae5",
          borderRadius: 8,
          border: "1px solid #10b981",
          color: "#065f46"
        }}>
          ✓ {setupSuccess}
        </div>
      )}

      {setupError && (
        <div style={{ ...S.warningBox, marginTop: 12 }}>
          ⚠ {setupError}
          {(legacySyncUrl || (qrBaseUrl && qrApiKey)) && (
            <button
              onClick={() => {
                if (qrBaseUrl && qrApiKey) {
                  setupFromParams(qrBaseUrl, qrApiKey);
                } else if (legacySyncUrl) {
                  setupFromSyncUrl(legacySyncUrl);
                }
              }}
              disabled={isSettingUp}
              style={{
                ...S.btnPrimary,
                width: "100%",
                marginTop: 8,
                fontSize: 13,
                opacity: isSettingUp ? 0.6 : 1,
                cursor: isSettingUp ? "not-allowed" : "pointer"
              }}
            >
              {isSettingUp ? "設定中..." : "🔄 再試行"}
            </button>
          )}
        </div>
      )}

      {isOpen && !configured && !setupError && (
        <div style={{ marginTop: 12, padding: 12, background: "#f3f4f6", borderRadius: 8, fontSize: 13, color: "#4b5563" }}>
          {isSettingUp
            ? "設定中..."
            : "PCで /sync/page を開き、表示されたQRコードをスマホで読み取ってください。"}
        </div>
      )}
    </div>
  );
}
