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
  const [syncUrlSuccess, setSyncUrlSuccess] = useState<string | null>(null);

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
      console.log("[ApiUrlBox] fetchSyncUrl called with:", syncUrl);
      const response = await fetch(syncUrl, { cache: "no-store" });
      if (!response.ok) {
        console.error("[ApiUrlBox] fetchSyncUrl failed:", response.status, response.statusText);
        setSyncUrlError("PCと同じWi-Fiに接続されているか確認してください");
        return;
      }

      const data = await response.json();
      console.log("[ApiUrlBox] fetchSyncUrl response:", data);
      const normalized = data.base_url ? String(data.base_url).replace(/\/+$/, "") : "";
      const apiKey = data.api_key ? String(data.api_key) : "";

      console.log("[ApiUrlBox] normalized:", normalized, "apiKey:", apiKey ? "***" : "");

      try {
        if (normalized) {
          setApiBaseUrl(normalized);
          console.log("[ApiUrlBox] setApiBaseUrl called");
        }
        if (apiKey) {
          setApiKey(apiKey);
          console.log("[ApiUrlBox] setApiKey called");
        }
      } catch (e: any) {
        console.error("[ApiUrlBox] localStorage save failed:", e);
        setSyncUrlError(e?.message ?? "設定の保存に失敗しました");
        return;
      }

      // QRセットアップ完了フラグを設定
      if (normalized && apiKey) {
        console.log("[ApiUrlBox] Setting setup_via_qr to true");
        try {
          setSetupViaQr(true);
          // localStorageの値を確認
          const saved = localStorage.getItem("setup_via_qr");
          console.log("[ApiUrlBox] setup_via_qr saved value:", saved);
          
          if (saved !== "1") {
            console.error("[ApiUrlBox] setup_via_qr was not saved correctly!");
            setSyncUrlError("設定の保存に失敗しました。もう一度お試しください。");
            return;
          }
          
          setSyncUrlSuccess("設定が完了しました！ページをリロードします...");
          setSyncUrlError(null);
          
          // localStorageの更新を確実に反映させるため、少し待ってから通知
          setTimeout(() => {
            console.log("[ApiUrlBox] Notifying configured change");
            notifyConfigured();
            // さらに確実に再レンダリングをトリガー
            setTimeout(() => {
              notifyConfigured();
              // 最終的にページをリロードして確実に反映
              setTimeout(() => {
                console.log("[ApiUrlBox] Reloading page to ensure changes are applied");
                window.location.reload();
              }, 500);
            }, 200);
          }, 300);
        } catch (e: any) {
          console.error("[ApiUrlBox] setSetupViaQr failed:", e);
          setSyncUrlError(e?.message ?? "設定の保存に失敗しました");
          return;
        }
      } else {
        console.warn("[ApiUrlBox] normalized or apiKey is empty, not setting setup_via_qr");
        setSyncUrlError(`設定に失敗しました。normalized: ${normalized ? "✓" : "✗"}, apiKey: ${apiKey ? "✓" : "✗"}`);
        notifyConfigured();
      }

      removeUrlParams(["sync_url"]);
      setSyncUrlParamState(null);
    } catch (error: any) {
      console.error("[ApiUrlBox] fetchSyncUrl exception:", error);
      setSyncUrlError("PCと同じWi-Fiに接続されているか確認してください");
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("sync_url");
    const syncUrlParam = raw ? decodeURIComponent(raw) : null;

    console.log("[ApiUrlBox] useEffect - sync_url param:", syncUrlParam ? "found" : "not found");
    if (syncUrlParam) {
      console.log("[ApiUrlBox] sync_url value:", syncUrlParam);
    }

    // QRから来たときは最優先で自動設定
    if (syncUrlParam) {
      console.log("[ApiUrlBox] Calling fetchSyncUrl with sync_url param");
      setSyncUrlParamState(syncUrlParam);
      fetchSyncUrl(syncUrlParam);
      return;
    }

    // 既存設定の反映
    console.log("[ApiUrlBox] No sync_url param, using existing config");
    notifyConfigured();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const configured = !!getApiBaseUrl().trim() && !!getApiKey().trim();

  return (
    <div style={S.card}>
      <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 16, color: "#1f2937" }}>
        同期
      </div>

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

      {isOpen && (
        <>
          {syncUrlSuccess && (
            <div style={{ 
              marginTop: 12, 
              padding: 12, 
              background: "#d1fae5", 
              borderRadius: 8,
              border: "1px solid #10b981",
              color: "#065f46"
            }}>
              ✓ {syncUrlSuccess}
            </div>
          )}
          {syncUrlError && (
            <div style={{ ...S.warningBox, marginTop: 12 }}>
              ⚠ {syncUrlError}
              {syncUrlParamState && (
                <button
                  onClick={() => {
                    setSyncUrlSuccess(null);
                    setSyncUrlError(null);
                    fetchSyncUrl(syncUrlParamState);
                  }}
                  style={{ ...S.btnPrimary, width: "100%", marginTop: 8, fontSize: 13 }}
                >
                  🔄 再試行
                </button>
              )}
            </div>
          )}
          
          {!configured && (
            <div style={{ marginTop: 12, padding: 12, background: "#f3f4f6", borderRadius: 8 }}>
              <div style={{ fontSize: 13, color: "#4b5563", marginBottom: 8 }}>
                QRコードをスキャンして設定してください
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>
                現在のURL: {window.location.href}
              </div>
              {(() => {
                const params = new URLSearchParams(window.location.search);
                const syncUrl = params.get("sync_url");
                return syncUrl ? (
                  <div style={{ fontSize: 12, color: "#059669", marginBottom: 8 }}>
                    ✓ sync_url パラメータが見つかりました
                    <button
                      onClick={() => {
                        const decoded = decodeURIComponent(syncUrl);
                        setSyncUrlParamState(decoded);
                        fetchSyncUrl(decoded);
                      }}
                      style={{ ...S.btnPrimary, width: "100%", marginTop: 8, fontSize: 13 }}
                    >
                      🔄 設定を実行
                    </button>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "#dc2626" }}>
                    ✗ sync_url パラメータが見つかりません。QRコードを再スキャンしてください。
                  </div>
                );
              })()}
            </div>
          )}
        </>
      )}
    </div>
  );
}
