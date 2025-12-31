import { useEffect, useState } from "react";
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get("from") === "qr") {
      const api = window.location.origin.replace(/:\d+$/, ":8000");
      setBaseUrl(api);
      setApiBaseUrl(api);
      onBaseUrlChange?.(api);
    } else {
      const saved = getApiBaseUrl();
      if (saved) {
        setBaseUrl(saved);
        onBaseUrlChange?.(saved);
      }
    }
  }, [onBaseUrlChange]);

  return (
    <div style={S.card}>
      {/* タイトル */}
      <div style={{ fontWeight: 700, marginBottom: 8 }}>同期設定</div>

      {/* URL入力 */}
      <div style={{ marginBottom: 8 }}>
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
          opacity: online && !syncing ? 1 : 0.5,
        }}
      >
        {syncing ? "同期中..." : `同期する（未送信 ${itemsCount} 件）`}
      </button>

      {/* 状態表示 */}
      {!online && (
        <div style={{ ...S.muted, color: "#c00", marginTop: 8 }}>
          ● オフライン中：帰宅後に同期できます
        </div>
      )}
      {online && !syncing && itemsCount === 0 && (
        <div style={{ ...S.muted, marginTop: 8 }}>
          未送信データはありません
        </div>
      )}
    </div>
  );
}
