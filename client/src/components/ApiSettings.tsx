import { useMemo, useState } from "react";
import { getApiBaseUrl, setApiBaseUrl } from "../config/api";

export function ApiSettings() {
  const initial = useMemo(() => getApiBaseUrl(), []);
  const [url, setUrl] = useState(initial);
  const [msg, setMsg] = useState<string>("");

  const save = () => {
    setApiBaseUrl(url);
    setMsg("保存しました。");
  };

  return (
    <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>同期先URL</div>

      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="例) http://10.76.108.202:8000"
        style={{ width: "100%", padding: 8 }}
      />

      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={save}>保存</button>
        <button
          onClick={async () => {
            const base = url.trim().replace(/\/+$/, "");
            if (!base) return setMsg("URLを入力してください。");
            try {
              // まずは /docs が返るかでもOK（本当は /health が理想）
              const res = await fetch(`${base}/docs`, { method: "GET" });
              setMsg(res.ok ? "接続OK（/docsが応答）" : `接続NG（status=${res.status}）`);
            } catch {
              setMsg("接続NG（通信できません）");
            }
          }}
        >
          疎通チェック
        </button>
      </div>

      {msg && <div style={{ marginTop: 8 }}>{msg}</div>}
    </div>
  );
}
