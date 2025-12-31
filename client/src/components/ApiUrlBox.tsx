import { useEffect, useState } from "react";
import { getApiBaseUrl, setApiBaseUrl } from "../config/api";

type Props = {
  itemsCount: number;
  online: boolean;
  syncing: boolean;
  onSync: () => void;
  onBaseUrlChange?: (url: string) => void;
};

export default function ApiUrlBox({ itemsCount, online, syncing, onSync, onBaseUrlChange }: Props) {
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
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>同期先URL（PCのIP）</div>

      <input
        placeholder="http://192.168.x.x:8000"
        value={baseUrl}
        onChange={(e) => {
          setBaseUrl(e.target.value);
          setApiBaseUrl(e.target.value);
          onBaseUrlChange?.(e.target.value);
        }}
        style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
      />

      <button
        onClick={onSync}
        disabled={!online || syncing}
        style={{
          width: "100%",
          marginTop: 8,
          padding: 12,
          borderRadius: 12,
          opacity: online && !syncing ? 1 : 0.5,
        }}
      >
        {syncing ? "同期中..." : `同期する（未送信 ${itemsCount} 件）`}
      </button>

      {!online && (
        <div style={{ fontSize: 12, color: "#c00", marginTop: 6 }}>
          オフライン中：帰宅後に同期できます
        </div>
      )}
    </div>
  );
}
