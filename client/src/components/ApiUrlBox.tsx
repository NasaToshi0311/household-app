import { useEffect, useState, useRef } from "react";
import { getApiBaseUrl, setApiBaseUrl } from "../config/api";
import * as S from "../ui/styles";

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
      const api = window.location.origin.replace(/:\d+$/, ":8000");
      setBaseUrl(api);
      setApiBaseUrl(api);
      onBaseUrlChangeRef.current?.(api);
    } else {
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
