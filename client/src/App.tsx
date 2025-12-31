import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { addPending, getAllPending, removePending, removeOnePending } from "./db";
import type { PendingExpense } from "./db";
import { getApiBaseUrl, setApiBaseUrl } from "./config/api";
import { useOnline } from "./hooks/useOnline";
import SummaryPage from "./pages/SummaryPage";
import { syncExpenses } from "./api/expenses";

export default function App() {
  const [items, setItems] = useState<PendingExpense[]>([]);
  const [baseUrl, setBaseUrl] = useState<string>("");
  const [tab, setTab] = useState<"input" | "summary">("input");
  const online = useOnline();
  const [syncing, setSyncing] = useState(false);
  // 入力用state
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("食費");
  const [note, setNote] = useState("");
  const [paidBy, setPaidBy] = useState<"me" | "her">("me");
  

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
  
    if (params.get("from") === "qr") {
      const api = window.location.origin.replace(/:\d+$/, ":8000");
      setBaseUrl(api);
      setApiBaseUrl(api);
    } else {
      const saved = getApiBaseUrl();
      if (saved) setBaseUrl(saved);
    }
  
    refresh();
  }, []);
  

  async function refresh() {
    setItems(await getAllPending());
  }

  async function add() {
    if (!amount) {
      alert("金額を入力してください");
      return;
    }

    const item: PendingExpense = {
      client_uuid: uuidv4(),
      date: new Date().toISOString().slice(0, 10),
      amount: Number(amount),
      category,
      note,
      paid_by: paidBy,
    };

    await addPending(item);
    setAmount("");
    setNote("");
    refresh();
  }

  async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 8000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
  
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(id);
    }
  }

  async function sync() {
    if (syncing) return;
    setSyncing(true);
  
    try {
      const latest = await getAllPending();
      if (latest.length === 0) {
        alert("未送信がありません");
        return;
      }
  
      await syncExpenses(latest);
      await removePending(latest.map(i => i.client_uuid));
      await refresh();
      alert("同期完了");
    } catch (e: any) {
      if (e?.name === "AbortError") {
        alert("同期失敗: タイムアウト");
      } else {
        alert(e?.message ?? "同期失敗");
      }
    } finally {
      setSyncing(false);
    }
  }
  

  const tabBtn = (key: "input" | "summary", label: string) => (
    <button
      onClick={() => setTab(key)}
      style={{
        flex: 1,
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid #ddd",
        background: tab === key ? "#eaeaea" : "#fafafa",
        fontWeight: tab === key ? 700 : 500,
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ padding: 16, maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ fontSize: 20, fontWeight: 800 }}>家計簿（スマホ）</h1>

      {/* 共通：同期先URL */}
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>同期先URL（PCのIP）</div>
        <input
          placeholder="http://192.168.x.x:8000"
          value={baseUrl}
          onChange={(e) => {
            setBaseUrl(e.target.value);
            setApiBaseUrl(e.target.value);
          }}
          style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
        />
        <button
          onClick={sync}
          disabled={!online || syncing}
          style={{
            width: "100%",
            marginTop: 8,
            padding: 12,
            borderRadius: 12,
            opacity: online && !syncing ? 1 : 0.5,
          }}
        >
          {syncing ? "同期中..." : `同期する（未送信 ${items.length} 件）`}
        </button>

        {!online && (
          <div style={{ fontSize: 12, color: "#c00", marginTop: 6 }}>
            オフライン中：帰宅後に同期できます
          </div>
        )}
      </div>

      {/* タブ */}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {tabBtn("input", "入力")}
        {tabBtn("summary", "集計")}
      </div>

      <div style={{ marginTop: 12 }}>
        {tab === "summary" ? (
          <SummaryPage baseUrl={baseUrl} />
        ) : (
          <>
            <h2>入力</h2>
            <input
              type="number"
              placeholder="金額"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ width: "100%", marginBottom: 8, padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
            />

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ width: "100%", marginBottom: 8, padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
            >
              <option>食費</option>
              <option>日用品</option>
              <option>外食</option>
              <option>交通費</option>
              <option>その他</option>
            </select>

            <input
              placeholder="メモ（任意）"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ width: "100%", marginBottom: 8, padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
            />

            <div style={{ marginBottom: 8 }}>
              <label>
                <input type="radio" checked={paidBy === "me"} onChange={() => setPaidBy("me")} />
                自分
              </label>
              {"  "}
              <label>
                <input type="radio" checked={paidBy === "her"} onChange={() => setPaidBy("her")} />
                彼女
              </label>
            </div>

            <button onClick={add} style={{ width: "100%", padding: 12, borderRadius: 12 }}>
              追加
            </button>

            <hr style={{ margin: "16px 0" }} />

            <h2>未送信</h2>
            <ul style={{ paddingLeft: 16 }}>
              {items.map((i) => (
                <li key={i.client_uuid} style={{ marginBottom: 10 }}>
                  {i.date} / {i.category} / {i.amount}円 / {i.paid_by}{" "}
                  <button
                    onClick={async () => {
                      await removeOnePending(i.client_uuid);
                      refresh();
                    }}
                  >
                    削除
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
