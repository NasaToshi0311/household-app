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
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{
    fetchCalled: boolean;
    fetchSuccess: boolean;
    responseData: any;
    normalized: string;
    apiKeySet: boolean;
    setupViaQrSet: boolean;
    localStorageValue: string | null;
  } | null>(null);

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

  /**
   * URLの形式を検証
   */
  function validateUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      // http または https のみ許可
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
      const testUrl = `${baseUrl}/health`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒タイムアウト
      
      const response = await fetch(testUrl, {
        method: "GET",
        headers: {
          "X-API-Key": apiKey,
        },
        signal: controller.signal,
        cache: "no-store",
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.warn("[ApiUrlBox] Connection test timeout");
      } else {
        console.warn("[ApiUrlBox] Connection test failed:", error);
      }
      return false;
    }
  }

  /**
   * 設定を保存する共通処理
   */
  async function saveConfiguration(baseUrl: string, apiKey: string, testConnectionAfterSave: boolean = false): Promise<boolean> {
    if (isSettingUp) {
      console.warn("[ApiUrlBox] Setup already in progress, skipping");
      return false;
    }

    // URLの検証
    if (!validateUrl(baseUrl)) {
      setSyncUrlError(`無効なURL形式です: ${baseUrl}`);
      return false;
    }

    // APIキーの検証（空でないこと）
    if (!apiKey || apiKey.trim().length === 0) {
      setSyncUrlError("APIキーが空です");
      return false;
    }

    setIsSettingUp(true);
    setSyncUrlError(null);
    setSyncUrlSuccess(null);

    try {
      setApiBaseUrl(baseUrl);
      setApiKey(apiKey);
      setSetupViaQr(true);

      // localStorageの値を確認（少し待ってから）
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const saved = localStorage.getItem("setup_via_qr");
      const savedBaseUrl = localStorage.getItem("household_api_base_url");
      const savedApiKey = localStorage.getItem("household_api_key");

      console.log("[ApiUrlBox] setup_via_qr saved value:", saved);
      console.log("[ApiUrlBox] base_url saved value:", savedBaseUrl);
      console.log("[ApiUrlBox] api_key saved value:", savedApiKey ? "***" : "");

      if (saved === "1" && savedBaseUrl && savedApiKey) {
        // 設定が正しく保存されたことを確認
        if (savedBaseUrl === baseUrl && savedApiKey === apiKey) {
          // 接続テストを実行（オプション）
          if (testConnectionAfterSave) {
            const connectionOk = await testConnection(baseUrl, apiKey);
            if (!connectionOk) {
              console.warn("[ApiUrlBox] Connection test failed, but settings are saved");
              // 接続テストに失敗しても設定は保存されているので、警告のみ
            }
          }
          return true;
        } else {
          console.error("[ApiUrlBox] Saved values don't match input values");
          setSyncUrlError("設定の保存に失敗しました（値が一致しません）");
          return false;
        }
      } else {
        console.error("[ApiUrlBox] Setup failed - saved:", saved, "base_url:", savedBaseUrl, "api_key:", savedApiKey ? "set" : "not set");
        setSyncUrlError(`設定の保存に失敗しました。saved: ${saved}, base_url: ${savedBaseUrl ? "set" : "not set"}, api_key: ${savedApiKey ? "set" : "not set"}`);
        return false;
      }
    } catch (e: any) {
      console.error("[ApiUrlBox] saveConfiguration failed:", e);
      setSyncUrlError(e?.message ?? "設定の保存に失敗しました");
      return false;
    } finally {
      setIsSettingUp(false);
    }
  }

  async function fetchSyncUrl(syncUrl: string) {
    if (isSettingUp) {
      console.warn("[ApiUrlBox] Setup already in progress, skipping fetchSyncUrl");
      return;
    }

    setIsSettingUp(true);
    setSyncUrlError(null);
    setSyncUrlSuccess(null);
    
    setDebugInfo({
      fetchCalled: true,
      fetchSuccess: false,
      responseData: null,
      normalized: "",
      apiKeySet: false,
      setupViaQrSet: false,
      localStorageValue: null,
    });
    
    try {
      console.log("[ApiUrlBox] fetchSyncUrl called with:", syncUrl);
      
      // タイムアウト付きでfetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒タイムアウト
      
      const response = await fetch(syncUrl, { 
        cache: "no-store",
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      if (!response.ok) {
        console.error("[ApiUrlBox] fetchSyncUrl failed:", response.status, response.statusText);
        setSyncUrlError(`サーバーエラー: ${response.status} ${response.statusText}`);
        setDebugInfo(prev => prev ? { ...prev, fetchSuccess: false } : null);
        return;
      }

      const data = await response.json();
      console.log("[ApiUrlBox] fetchSyncUrl response:", data);
      const normalized = data.base_url ? String(data.base_url).replace(/\/+$/, "") : "";
      const apiKey = data.api_key ? String(data.api_key) : "";

      console.log("[ApiUrlBox] normalized:", normalized, "apiKey:", apiKey ? "***" : "");
      
      setDebugInfo(prev => prev ? {
        ...prev,
        fetchSuccess: true,
        responseData: data,
        normalized: normalized,
      } : null);

      try {
        if (normalized) {
          setApiBaseUrl(normalized);
          console.log("[ApiUrlBox] setApiBaseUrl called");
        }
        if (apiKey) {
          setApiKey(apiKey);
          console.log("[ApiUrlBox] setApiKey called");
          setDebugInfo(prev => prev ? { ...prev, apiKeySet: true } : null);
        }
      } catch (e: any) {
        console.error("[ApiUrlBox] localStorage save failed:", e);
        setSyncUrlError(e?.message ?? "設定の保存に失敗しました");
        setDebugInfo(prev => prev ? { ...prev, fetchSuccess: false } : null);
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
          
          setDebugInfo(prev => prev ? {
            ...prev,
            setupViaQrSet: true,
            localStorageValue: saved,
          } : null);
          
          // localStorageの保存を確認（少し待ってから）
          setTimeout(() => {
            const savedAfterWait = localStorage.getItem("setup_via_qr");
            if (savedAfterWait !== "1") {
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
          }, 100);
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
      if (error.name === "AbortError") {
        setSyncUrlError("タイムアウト: サーバーへの接続に時間がかかりすぎています");
      } else {
        setSyncUrlError("PCと同じWi-Fiに接続されているか確認してください");
      }
      setDebugInfo(prev => prev ? { ...prev, fetchSuccess: false } : null);
    } finally {
      setIsSettingUp(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // 新しい方式: base_url と api_key を直接取得
    const baseUrlParam = params.get("base_url");
    const apiKeyParam = params.get("api_key");
    
    // 旧方式: sync_url から取得（後方互換性のため）
    const raw = params.get("sync_url");
    const syncUrlParam = raw ? decodeURIComponent(raw) : null;

    console.log("[ApiUrlBox] useEffect - base_url:", baseUrlParam ? "found" : "not found");
    console.log("[ApiUrlBox] useEffect - api_key:", apiKeyParam ? "found" : "not found");
    console.log("[ApiUrlBox] useEffect - sync_url:", syncUrlParam ? "found" : "not found");

    // 新しい方式を優先（base_url と api_key が直接含まれている場合）
    if (baseUrlParam && apiKeyParam) {
      console.log("[ApiUrlBox] Using direct base_url and api_key from QR code");
      console.log("[ApiUrlBox] baseUrlParam:", baseUrlParam);
      console.log("[ApiUrlBox] apiKeyParam:", apiKeyParam ? "***" : "");
      
      const decodedBaseUrl = decodeURIComponent(baseUrlParam);
      const decodedApiKey = decodeURIComponent(apiKeyParam);
      
      console.log("[ApiUrlBox] decodedBaseUrl:", decodedBaseUrl);
      console.log("[ApiUrlBox] decodedApiKey:", decodedApiKey ? "***" : "");
      
      // 即座に設定を実行（接続テストも実行）
      saveConfiguration(decodedBaseUrl, decodedApiKey, true).then((success) => {
        if (success) {
          setSyncUrlSuccess("設定が完了しました！ページをリロードします...");
          setSyncUrlError(null);
          removeUrlParams(["base_url", "api_key"]);
          
          setTimeout(() => {
            notifyConfigured();
            setTimeout(() => {
              window.location.reload();
            }, 500);
          }, 300);
        }
      });
      return;
    }

    // 旧方式: sync_url から取得（後方互換性）
    if (syncUrlParam) {
      console.log("[ApiUrlBox] Calling fetchSyncUrl with sync_url param");
      setSyncUrlParamState(syncUrlParam);
      fetchSyncUrl(syncUrlParam);
      return;
    }

    // 既存設定の反映
    console.log("[ApiUrlBox] No QR params, using existing config");
    notifyConfigured();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const configured = !!getApiBaseUrl().trim() && !!getApiKey().trim();
  const currentApiBaseUrl = getApiBaseUrl().trim();
  const currentApiKey = getApiKey().trim();
  const isSetupViaQr = localStorage.getItem("setup_via_qr") === "1";

  return (
    <div style={S.card}>
      <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 16, color: "#1f2937" }}>
        同期
      </div>

      {isOpen && configured && (
        <div style={{ 
          marginBottom: 12, 
          padding: 12, 
          background: "#f0fdf4", 
          borderRadius: 8,
          border: "1px solid #86efac",
          fontSize: 12
        }}>
          <div style={{ fontWeight: 600, marginBottom: 8, color: "#166534" }}>
            ✓ 現在の設定
          </div>
          <div style={{ color: "#15803d", marginBottom: 4 }}>
            API URL: <span style={{ fontFamily: "monospace" }}>{currentApiBaseUrl}</span>
          </div>
          <div style={{ color: "#15803d" }}>
            API Key: <span style={{ fontFamily: "monospace" }}>{currentApiKey ? "***" : "(未設定)"}</span>
          </div>
          {isSetupViaQr && (
            <div style={{ marginTop: 8, fontSize: 11, color: "#059669" }}>
              QRコードで設定済み
            </div>
          )}
        </div>
      )}

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
                const baseUrl = params.get("base_url");
                const apiKey = params.get("api_key");
                const syncUrl = params.get("sync_url");
                
                // 新しい方式（base_url と api_key が直接含まれている場合）
                if (baseUrl && apiKey) {
                  return (
                    <div style={{ fontSize: 12, color: "#059669", marginBottom: 8 }}>
                      ✓ QRコードから設定情報を検出しました
                      <button
                        onClick={() => {
                          try {
                            const decodedBaseUrl = decodeURIComponent(baseUrl);
                            const decodedApiKey = decodeURIComponent(apiKey);
                            
                            saveConfiguration(decodedBaseUrl, decodedApiKey, true).then((success) => {
                              if (success) {
                                setSyncUrlSuccess("設定が完了しました！ページをリロードします...");
                                setSyncUrlError(null);
                                removeUrlParams(["base_url", "api_key"]);
                                
                                setTimeout(() => {
                                  notifyConfigured();
                                  setTimeout(() => {
                                    window.location.reload();
                                  }, 500);
                                }, 300);
                              }
                            });
                          } catch (e: any) {
                            setSyncUrlError(e?.message ?? "設定の保存に失敗しました");
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
                        {isSettingUp ? "設定中..." : "🔄 設定を実行"}
                      </button>
                    </div>
                  );
                }
                
                // 旧方式（sync_url パラメータがある場合）
                if (syncUrl) {
                  return (
                    <div style={{ fontSize: 12, color: "#059669", marginBottom: 8 }}>
                      ✓ sync_url パラメータが見つかりました（旧方式）
                      <button
                        onClick={() => {
                          const decoded = decodeURIComponent(syncUrl);
                          setSyncUrlParamState(decoded);
                          setDebugInfo(null);
                          fetchSyncUrl(decoded);
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
                        {isSettingUp ? "設定中..." : "🔄 設定を実行"}
                      </button>
                    </div>
                  );
                }
                
                return (
                  <div style={{ fontSize: 12, color: "#dc2626" }}>
                    ✗ QRコードパラメータが見つかりません。QRコードを再スキャンしてください。
                  </div>
                );
              })()}
              
              {debugInfo && (
                <div style={{ 
                  marginTop: 12, 
                  padding: 12, 
                  background: "#ffffff", 
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                  fontSize: 11,
                  fontFamily: "monospace"
                }}>
                  <strong style={{ display: "block", marginBottom: 8 }}>デバッグ情報:</strong>
                  <div>fetch呼び出し: {debugInfo.fetchCalled ? "✓" : "✗"}</div>
                  <div>fetch成功: {debugInfo.fetchSuccess ? "✓" : "✗"}</div>
                  <div>base_url取得: {debugInfo.normalized ? `✓ (${debugInfo.normalized})` : "✗"}</div>
                  <div>api_key設定: {debugInfo.apiKeySet ? "✓" : "✗"}</div>
                  <div>setup_via_qr設定: {debugInfo.setupViaQrSet ? "✓" : "✗"}</div>
                  <div>localStorage値: {debugInfo.localStorageValue ?? "null"}</div>
                  {debugInfo.responseData && (
                    <div style={{ marginTop: 8 }}>
                      <strong>レスポンス:</strong>
                      <pre style={{ 
                        marginTop: 4, 
                        padding: 8, 
                        background: "#f9fafb", 
                        borderRadius: 4,
                        overflow: "auto",
                        maxHeight: "200px"
                      }}>
                        {JSON.stringify(debugInfo.responseData, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
