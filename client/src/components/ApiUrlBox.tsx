import { useEffect, useState, useRef } from "react";
import { getApiBaseUrl, setApiBaseUrl, setApiKey } from "../config/api";
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
};

export default function ApiUrlBox({
  itemsCount,
  online,
  syncing,
  onSync,
  onBaseUrlChange,
}: Props) {
  const [baseUrl, setBaseUrl] = useState("");
  const onBaseUrlChangeRef = useRef(onBaseUrlChange);
  
  // 最新のコールバックを保持
  useEffect(() => {
    onBaseUrlChangeRef.current = onBaseUrlChange;
  }, [onBaseUrlChange]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("from") === "qr") {
      // QRコードから読み取ったデータを処理
      // URLパラメータからbase_urlとapi_keyを取得
      const baseUrlParam = params.get("base_url");
      const apiKeyParam = params.get("api_key");
      
      if (baseUrlParam) {
        setBaseUrl(baseUrlParam);
        setApiBaseUrl(baseUrlParam);
        onBaseUrlChangeRef.current?.(baseUrlParam);
      } else {
        // 旧形式のフォールバック（URLのみ）
        const api = window.location.origin.replace(/:\d+$/, ":8000");
        setBaseUrl(api);
        setApiBaseUrl(api);
        onBaseUrlChangeRef.current?.(api);
      }
      
      if (apiKeyParam) {
        setApiKey(apiKeyParam);
      }
    } else {
      // URLパラメータからJSONデータを取得（QRコード読み取り時）
      // QRコードにJSONが含まれている場合、それをURLパラメータとして渡す
      const qrDataParam = params.get("qr_data");
      if (qrDataParam) {
        try {
          const qrData = JSON.parse(decodeURIComponent(qrDataParam));
          if (qrData.base_url) {
            setBaseUrl(qrData.base_url);
            setApiBaseUrl(qrData.base_url);
            onBaseUrlChangeRef.current?.(qrData.base_url);
          }
          if (qrData.api_key) {
            setApiKey(qrData.api_key);
          }
          // パラメータをクリア
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete("qr_data");
          window.history.replaceState(null, "", newUrl.toString());
        } catch (e) {
          // JSON解析に失敗した場合は無視
        }
      }
      
      const saved = getApiBaseUrl();
      if (saved) {
        setBaseUrl(saved);
        onBaseUrlChangeRef.current?.(saved);
      }
    }
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
        disabled={!online || syncing}
        style={{
          ...(online && !syncing ? S.btnPrimary : S.btn),
          width: "100%",
          opacity: online && !syncing ? 1 : 0.6,
          cursor: online && !syncing ? "pointer" : "not-allowed",
        }}
      >
        {syncing 
          ? "同期中..." 
          : itemsCount > 0 
            ? `未送信データを同期する（${itemsCount}件）`
            : "同期する"}
      </button>

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
