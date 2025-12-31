import { useEffect, useMemo, useState } from "react";

type Summary = { start: string; end: string; total: number };
type ByCategory = { category: string; total: number };
type Expense = {
  id?: number;
  date: string;
  amount: number;
  category: string;
  note?: string | null;
  paid_by?: string | null;
};

function ymd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export default function SummaryPage({ baseUrl }: { baseUrl: string }) {
  const today = useMemo(() => new Date(), []);
  const [start, setStart] = useState<string>(ymd(startOfMonth(today)));
  const [end, setEnd] = useState<string>(ymd(endOfMonth(today)));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [byCategory, setByCategory] = useState<ByCategory[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const api = baseUrl.replace(/\/$/, "");

  async function fetchAll() {
    if (!api) {
      setError("同期先URLを入力してから集計してね");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const qs = `start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;

      const [sRes, cRes, eRes] = await Promise.all([
        fetch(`${api}/summary?${qs}`),
        fetch(`${api}/summary/by-category?${qs}`),
        fetch(`${api}/summary/expenses?${qs}&limit=50&offset=0`),
      ]);

      if (!sRes.ok) throw new Error("合計の取得に失敗");
      if (!cRes.ok) throw new Error("カテゴリ別の取得に失敗");
      if (!eRes.ok) throw new Error("明細の取得に失敗");

      const s: Summary = await sRes.json();
      const c: ByCategory[] = await cRes.json();
      const e: Expense[] = await eRes.json();

      setSummary(s);
      setByCategory(c);
      setExpenses(e);
    } catch (err: any) {
      setError(err?.message ?? "エラー");
    } finally {
      setLoading(false);
    }
  }

  async function deleteExpense(id?: number) {
    if (!api) {
      setError("同期先URLを入力してね");
      return;
    }
    if (!id) return;
  
    const ok = confirm("この明細を削除しますか？（論理削除）");
    if (!ok) return;
  
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${api}/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`削除に失敗: HTTP ${res.status}\n${text}`);
      }
  
      // 画面だけ即反映（気持ちよさ優先）
      setExpenses((prev) => prev.filter((x) => x.id !== id));
  
      // 集計も変わるので取り直す（確実）
      await fetchAll();
    } catch (err: any) {
      setError(err?.message ?? "削除エラー");
    } finally {
      setLoading(false);
    }
  }
  

  // baseUrl が入ったら自動で1回取得（QRから入ってきた時に便利）
  useEffect(() => {
    if (api) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  function setThisMonth() {
    const d = new Date();
    setStart(ymd(startOfMonth(d)));
    setEnd(ymd(endOfMonth(d)));
  }

  function setLastMonth() {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    setStart(ymd(startOfMonth(d)));
    setEnd(ymd(endOfMonth(d)));
  }

  function setLast7Days() {
    const d = new Date();
    const endD = new Date(d);
    const startD = new Date(d);
    startD.setDate(startD.getDate() - 6);
    setStart(ymd(startD));
    setEnd(ymd(endD));
  }

  const totalText = (summary?.total ?? 0).toLocaleString("ja-JP");

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>集計</h2>

      {!api && (
        <div style={{ background: "#fff7cc", border: "1px solid #ffe08a", padding: 12, borderRadius: 12, marginBottom: 12 }}>
          同期先URLが未設定です（上の入力欄に <b>http://192.168.x.x:8000</b> を入れてね）
        </div>
      )}

      <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 12, color: "#555" }}>開始日</label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            style={{ padding: 12, borderRadius: 10, border: "1px solid #ddd" }}
          />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 12, color: "#555" }}>終了日</label>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            style={{ padding: 12, borderRadius: 10, border: "1px solid #ddd" }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={setThisMonth} style={btnStyle}>今月</button>
          <button onClick={setLastMonth} style={btnStyle}>先月</button>
          <button onClick={setLast7Days} style={btnStyle}>直近7日</button>
          <button onClick={fetchAll} style={{ ...btnStyle, fontWeight: 700 }} disabled={loading || !api}>
            {loading ? "取得中..." : "集計する"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: "#ffecec", border: "1px solid #ffb3b3", padding: 12, borderRadius: 12, marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div style={cardStyle}>
        <div style={{ fontSize: 12, color: "#666" }}>
          {start} 〜 {end}
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            marginTop: 6,
            color: "#2563eb", // 青（安心・基準色）
          }}
        >
          ¥{totalText}
        </div>
        <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>合計（支出）</div>
      </div>

      <div style={{ height: 12 }} />

      <div style={cardStyle}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>カテゴリ別</div>
        {byCategory.length === 0 ? (
          <div style={{ color: "#666", fontSize: 13 }}>データなし</div>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {byCategory.slice(0, 10).map((c) => (
              <div key={c.category} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ color: "#333" }}>{c.category}</div>
                <div style={{ fontWeight: 700 }}>¥{c.total.toLocaleString("ja-JP")}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ height: 12 }} />

      <div style={cardStyle}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>明細（最新50件）</div>
        {expenses.length === 0 ? (
          <div style={{ color: "#666", fontSize: 13 }}>データなし</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {expenses.map((e) => (
              <div
                key={e.id ?? `${e.date}-${e.amount}-${e.category}`}
                style={{
                  padding: 10,
                  borderRadius: 12,
                  background: "#fafafa",
                  border: "1px solid #eee",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#666" }}>{e.date}</div>
                    <div style={{ fontWeight: 700 }}>{e.category}</div>
                    {e.note ? <div style={{ fontSize: 12, color: "#666" }}>{e.note}</div> : null}
                  </div>
                  <div style={{ display: "grid", justifyItems: "end", gap: 6 }}>
                    <div style={{ fontWeight: 800 }}>¥{e.amount.toLocaleString("ja-JP")}</div>

                    <button
                      onClick={() => deleteExpense(e.id)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 10,
                        border: "1px solid #fca5a5",
                        background: "#fee2e2",
                        color: "#b91c1c",
                        fontSize: 12,
                      }}
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e5e5",
  borderRadius: 16,
  padding: 14,
  background: "#fff",
  boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
};

const btnStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "#fafafa",
};
