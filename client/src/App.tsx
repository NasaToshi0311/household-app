import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { addPending, getAllPending, removePending, removeOnePending } from "./db";
import type { PendingExpense } from "./db";
import SummaryPage from "./pages/SummaryPage";

export default function App() {
  const [items, setItems] = useState<PendingExpense[]>([]);
  const [baseUrl, setBaseUrl] = useState<string>("");
  const [tab, setTab] = useState<"input" | "summary">("input");

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
      localStorage.setItem("baseUrl", api);
    } else {
      const saved = localStorage.getItem("baseUrl");
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

  async function sync() {
    try {
      if (!baseUrl) {
        alert("同期先URLを入力してください");
        return;
      }

      const latest = await getAllPending();
      if (latest.length === 0) {
        alert("未送信がありません");
        return;
      }

      const api = baseUrl.replace(/\/$/, "");
      const url = `${api}/sync/expenses`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: latest }),
      });

      if (!res.ok) {
        const text = await res.text();
        alert(`同期失敗: HTTP ${res.status}\n${text}`);
        return;
      }

      await removePending(latest.map((i) => i.client_uuid));
      await refresh();
      alert("同期完了");
    } catch (e: any) {
      alert(`同期失敗(通信エラー): ${e?.message ?? e}`);
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
            localStorage.setItem("baseUrl", e.target.value);
          }}
          style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
        />
        <button onClick={sync} style={{ width: "100%", marginTop: 8, padding: 12, borderRadius: 12 }}>
          同期する（未送信 {items.length} 件）
        </button>
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
