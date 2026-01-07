import { useEffect, useState, useRef } from "react";
import { getApiBaseUrl, setApiBaseUrl, setApiKey, getApiKey, clearApiBaseUrl, clearApiKey } from "../config/api";
import * as S from "../ui/styles";

function HelpSection() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div style={{ marginBottom: 12 }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid #d1d5db",
          background: "#f9fafb",
          color: "#6b7280",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>📋 同期先URLの確認方法</span>
        <span style={{ fontSize: 18 }}>{isOpen ? "▲" : "▼"}</span>
      </button>
      
      {isOpen && (
        <div style={{
          marginTop: 8,
          padding: 12,
          borderRadius: 8,
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          fontSize: 13,
          lineHeight: 1.6,
          color: "#374151",
        }}>
          <div style={{ marginBottom: 8, fontWeight: 700, color: "#1f2937" }}>
            方法1: PCのIPアドレスを確認
          </div>
          <div style={{ marginBottom: 4, paddingLeft: 8 }}>
            <strong>Windows:</strong>
            <div style={{ paddingLeft: 12, marginTop: 4 }}>
              1. コマンドプロンプトを開く<br/>
              2. <code style={{ background: "#e5e7eb", padding: "2px 4px", borderRadius: 4 }}>ipconfig</code> を実行<br/>
              3. 「IPv4アドレス」を確認（例: 192.168.1.100）<br/>
              4. 入力欄に <code style={{ background: "#e5e7eb", padding: "2px 4px", borderRadius: 4 }}>http://192.168.1.100:8000</code> を入力
            </div>
          </div>
          <div style={{ marginBottom: 12, paddingLeft: 8 }}>
            <strong>Mac/Linux:</strong>
            <div style={{ paddingLeft: 12, marginTop: 4 }}>
              1. ターミナルを開く<br/>
              2. <code style={{ background: "#e5e7eb", padding: "2px 4px", borderRadius: 4 }}>ifconfig</code> または <code style={{ background: "#e5e7eb", padding: "2px 4px", borderRadius: 4 }}>ip addr</code> を実行<br/>
              3. IPアドレスを確認（例: 192.168.1.100）<br/>
              4. 入力欄に <code style={{ background: "#e5e7eb", padding: "2px 4px", borderRadius: 4 }}>http://192.168.1.100:8000</code> を入力
            </div>
          </div>
          
          <div style={{ marginBottom: 8, fontWeight: 700, color: "#1f2937" }}>
            方法2: QRコードで自動設定（推奨）
          </div>
          <div style={{ paddingLeft: 8, marginBottom: 4 }}>
            1. PCのブラウザで <code style={{ background: "#e5e7eb", padding: "2px 4px", borderRadius: 4 }}>http://[PCのIP]:8000/sync/page</code> にアクセス<br/>
            2. 表示されたQRコードをスマホのカメラで読み取る<br/>
            3. 自動的にURLが設定されます
          </div>
          
          <div style={{ marginTop: 12, padding: 8, background: "#fef3c7", borderRadius: 6, fontSize: 12 }}>
            <strong>⚠ 注意:</strong> PCとスマホは同じWi-Fiネットワークに接続されている必要があります
          </div>
        </div>
      )}
    </div>
  );
}

type Props = {
  itemsCount: number;
  online: boolean;
  syncing: boolean;
  onSync: () => void;
  onBaseUrlChange?: (url: string) => void;
  onConfiguredChange?: (isConfigured: boolean) => void;
};

export default function ApiUrlBox({
  itemsCount,
  online,
  syncing,
  onSync,
  onBaseUrlChange,
  onConfiguredChange,
}: Props) {
  const [baseUrl, setBaseUrl] = useState("");
  const [syncUrlError, setSyncUrlError] = useState<string | null>(null);
  const [syncUrlParamState, setSyncUrlParamState] = useState<string | null>(null);
  const onBaseUrlChangeRef = useRef(onBaseUrlChange);
  const onConfiguredChangeRef = useRef(onConfiguredChange);
  
  // 最新のコールバックを保持
  useEffect(() => {
    onBaseUrlChangeRef.current = onBaseUrlChange;
  }, [onBaseUrlChange]);
  
  useEffect(() => {
    onConfiguredChangeRef.current = onConfiguredChange;
  }, [onConfiguredChange]);
  
  // 設定状態をチェックして通知する関数
  function checkAndNotifyConfigured() {
    const apiUrl = getApiBaseUrl().trim();
    const apiKey = getApiKey().trim();
    const isConfigured = !!apiUrl && !!apiKey;
    onConfiguredChangeRef.current?.(isConfigured);
  }
  
  // URLパラメータを削除する関数
  function removeUrlParams(paramsToRemove: string[]) {
    const newUrl = new URL(window.location.href);
    paramsToRemove.forEach(param => {
      newUrl.searchParams.delete(param);
    });
    window.history.replaceState(null, "", newUrl.toString());
  }

  // sync_url から base_url と api_key を取得する関数
  async function fetchSyncUrl(syncUrl: string) {
    try {
      const response = await fetch(syncUrl, { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        // base_url の末尾の / を削除して正規化
        const normalized = data.base_url ? String(data.base_url).replace(/\/+$/, "") : "";
        const apiKey = data.api_key ? String(data.api_key) : "";
        
        if (normalized) {
          setBaseUrl(normalized);
          setApiBaseUrl(normalized);
          onBaseUrlChangeRef.current?.(normalized);
        }
        if (apiKey) {
          setApiKey(apiKey);
        }
        
        // 設定完了を通知（取得したその場で直接呼ぶ）
        const ok = !!normalized && !!apiKey;
        onConfiguredChangeRef.current?.(ok);
        
        // URLから sync_url を削除
        removeUrlParams(["sync_url"]);
        // state も null にする
        setSyncUrlParamState(null);
        // エラーをクリア
        setSyncUrlError(null);
      } else {
        // fetch失敗時は警告表示
        setSyncUrlError("PCと同じWi-Fiネットワークに接続されているか確認してください");
        // sync_url は URL に残す（リロードで再試行できるように）
        console.error("Failed to fetch sync URL:", response.status);
      }
    } catch (e) {
      // fetch失敗時は警告表示
      setSyncUrlError("PCと同じWi-Fiネットワークに接続されているか確認してください");
      // sync_url は URL に残す（リロードで再試行できるように）
      console.error("Error fetching sync URL:", e);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // sync_url パラメータを最優先で処理（新しい方式）
    const raw = params.get("sync_url");
    const syncUrlParam = raw ? decodeURIComponent(raw) : null;
    if (syncUrlParam) {
      // state に保存
      setSyncUrlParamState(syncUrlParam);
      // fetch を実行
      fetchSyncUrl(syncUrlParam);
      return; // sync_url が処理された場合は早期リターン
    }

    // 既存の設定を読み込む
    const saved = getApiBaseUrl();
    if (saved) {
      setBaseUrl(saved);
      onBaseUrlChangeRef.current?.(saved);
    }
    
    // 初期状態を通知
    checkAndNotifyConfigured();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // マウント時のみ実行

  return (
    <div style={S.card}>
      {/* タイトル */}
      <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 16, color: "#1f2937" }}>
        同期設定
      </div>

      {/* ヘルプセクション */}
      <HelpSection />

      {/* URL入力 */}
      <div style={{ marginBottom: 12 }}>
        <div style={S.label}>同期先URL（PCのIP）</div>
        <input
          placeholder="http://192.168.x.x:8000"
          value={baseUrl}
          onChange={(e) => {
            const v = e.target.value;
            setBaseUrl(v);
            setApiBaseUrl(v);
            onBaseUrlChange?.(v);
            // 設定状態をチェック（APIキーが既に設定されている場合に備える）
            checkAndNotifyConfigured();
          }}
          style={S.input}
        />
        {!baseUrl && (
          <div style={{
            marginTop: 6,
            fontSize: 12,
            color: "#6b7280",
            fontStyle: "italic",
          }}>
            💡 上記の「同期先URLの確認方法」を開いて設定方法を確認してください
          </div>
        )}
      </div>

      {/* 同期ボタン */}
      <button
        onClick={onSync}
        disabled={!online || syncing || !baseUrl}
        style={{
          ...(online && !syncing && baseUrl ? S.btnPrimary : S.btn),
          width: "100%",
          opacity: online && !syncing && baseUrl ? 1 : 0.6,
          cursor: online && !syncing && baseUrl ? "pointer" : "not-allowed",
        }}
      >
        {syncing 
          ? "同期中..." 
          : !baseUrl
            ? "同期先URLを設定してください"
            : itemsCount > 0 
              ? `未送信データを同期する（${itemsCount}件）`
              : "同期する"}
      </button>

      {/* 設定リセットボタン */}
      {(() => {
        const apiUrl = getApiBaseUrl().trim();
        const apiKey = getApiKey().trim();
        if (apiUrl || apiKey) {
          return (
            <button
              onClick={() => {
                clearApiBaseUrl();
                clearApiKey();
                setBaseUrl("");
                onBaseUrlChangeRef.current?.("");
                onConfiguredChangeRef.current?.(false);
              }}
              style={{
                ...S.btn,
                width: "100%",
                marginTop: 12,
                background: "#fee2e2",
                border: "1px solid #fca5a5",
                color: "#991b1b",
              }}
            >
              🔄 設定をリセット
            </button>
          );
        }
        return null;
      })()}

      {/* APIキー状態表示 */}
      {(() => {
        const apiKey = getApiKey().trim();
        if (!apiKey) {
          return (
            <div style={{ 
              ...S.warningBox, 
              marginTop: 12,
              background: "#fef3c7",
              border: "2px solid #f59e0b",
              color: "#92400e",
            }}>
              ⚠ APIキーが設定されていません。QRコードを読み取って設定してください。
            </div>
          );
        }
        return (
          <div style={{ 
            ...S.successBox, 
            marginTop: 12,
            fontSize: 12,
          }}>
            ✓ APIキーが設定されています（長さ: {apiKey.length}文字）
          </div>
        );
      })()}

      {/* sync_url エラー表示 */}
      {syncUrlError && (
        <div style={{ 
          ...S.warningBox, 
          marginTop: 12,
          background: "#fee2e2",
          border: "2px solid #f87171",
          color: "#991b1b",
        }}>
          <div style={{ marginBottom: syncUrlParamState ? 8 : 0 }}>
            ⚠ {syncUrlError}
          </div>
          {syncUrlParamState && (
            <button
              onClick={() => fetchSyncUrl(syncUrlParamState)}
              style={{
                ...S.btnPrimary,
                width: "100%",
                marginTop: 8,
                fontSize: 13,
              }}
            >
              🔄 再試行
            </button>
          )}
        </div>
      )}

      {/* 状態表示 */}
      {!online && (
        <div style={{ 
          ...S.infoBox, 
          marginTop: 12,
          background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
          border: "2px solid #3b82f6",
          color: "#1e40af",
        }}>
          ● オフライン中：帰宅後に同期できます
        </div>
      )}
      {online && !syncing && itemsCount === 0 && (
        <div style={{ 
          ...S.successBox, 
          marginTop: 12,
        }}>
          ✓ 未送信データはありません
        </div>
      )}
      {online && !syncing && itemsCount > 0 && (
        <div style={{ 
          ...S.warningBox, 
          marginTop: 12,
        }}>
          ⚠ 未送信データが {itemsCount} 件あります
        </div>
      )}
    </div>
  );
}
