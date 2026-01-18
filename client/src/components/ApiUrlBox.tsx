import { useEffect, useState, useRef } from "react";
import { getApiBaseUrl, setApiBaseUrl, setApiKey, getApiKey, setSetupViaQr } from "../config/api";
import * as S from "../ui/styles";

type Props = {
  itemsCount: number;
  online: boolean;
  syncing: boolean;
  onSync: () => void;
  onConfiguredChange?: () => void;
  isOpen: boolean;
};

export default function ApiUrlBox({
  itemsCount,
  online,
  syncing,
  onSync,
  onConfiguredChange,
  isOpen,
}: Props) {
  const [syncUrlError, setSyncUrlError] = useState<string | null>(null);
  const [syncUrlParamState, setSyncUrlParamState] = useState<string | null>(null);

  const onConfiguredChangeRef = useRef(onConfiguredChange);

  useEffect(() => {
    onConfiguredChangeRef.current = onConfiguredChange;
  }, [onConfiguredChange]);

  function notifyConfigured() {
    onConfiguredChangeRef.current?.();
  }

  function removeUrlParams(paramsToRemove: string[]) {
    const newUrl = new URL(window.location.href);
    paramsToRemove.forEach((param) => newUrl.searchParams.delete(param));
    window.history.replaceState(null, "", newUrl.toString());
  }

  async function fetchSyncUrl(syncUrl: string) {
    try {
      const response = await fetch(syncUrl, { cache: "no-store" });
      if (!response.ok) {
        setSyncUrlError("PCと同じWi-Fiに接続されているか確認してください");
        return;
      }

      const data = await response.json();
      const normalized = data.base_url ? String(data.base_url).replace(/\/+$/, "") : "";
      const apiKey = data.api_key ? String(data.api_key) : "";

      try {
        if (normalized) {
          setApiBaseUrl(normalized);
        }
        if (apiKey) {
          setApiKey(apiKey);
        }
      } catch (e: any) {
        setSyncUrlError(e?.message ?? "設定の保存に失敗しました");
        return;
      }

      // QRセットアップ完了フラグを設定
      if (normalized && apiKey) {
        setSetupViaQr(true);
      }

      notifyConfigured();

      removeUrlParams(["sync_url"]);
      setSyncUrlParamState(null);
      setSyncUrlError(null);
    } catch {
      setSyncUrlError("PCと同じWi-Fiに接続されているか確認してください");
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("sync_url");
    const syncUrlParam = raw ? decodeURIComponent(raw) : null;

    // QRから来たときは最優先で自動設定
    if (syncUrlParam) {
      setSyncUrlParamState(syncUrlParam);
      fetchSyncUrl(syncUrlParam);
      return;
    }

    // 既存設定の反映
    notifyConfigured();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const configured = !!getApiBaseUrl().trim() && !!getApiKey().trim();

  return (
    <div style={S.card}>
      <div style={{ fontWeight: 700, marginBottom: isOpen ? 12 : 0, fontSize: 16, color: "#1f2937" }}>
        同期
      </div>

      {isOpen && (
        <>
          <button
            onClick={onSync}
            disabled={!online || syncing || !configured}
            style={{
              ...(online && !syncing && configured ? S.btnPrimary : S.btn),
              width: "100%",
              opacity: online && !syncing && configured ? 1 : 0.6,
              cursor: online && !syncing && configured ? "pointer" : "not-allowed",
            }}
          >
            {syncing
              ? "同期中..."
              : !configured
              ? "まずQRで同期設定してください"
              : itemsCount > 0
              ? `同期する（未送信 ${itemsCount} 件）`
              : "同期する"}
          </button>

          {syncUrlError && (
            <div style={{ ...S.warningBox, marginTop: 12 }}>
              ⚠ {syncUrlError}
              {syncUrlParamState && (
                <button
                  onClick={() => fetchSyncUrl(syncUrlParamState)}
                  style={{ ...S.btnPrimary, width: "100%", marginTop: 8, fontSize: 13 }}
                >
                  🔄 再試行
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
