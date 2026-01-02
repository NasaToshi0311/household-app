import { useEffect, useMemo, useState, useCallback } from "react";
import { useOnline } from "../hooks/useOnline";
import { fetchWithTimeout } from "../api/fetch";
import ConfirmDialog from "../components/ConfirmDialog";
import { payerLabel } from "../constants/payer";

type Summary = { start: string; end: string; total: number };
type ByCategory = { category: string; total: number };
type ByPayer = { paid_by: string | null; total: number };
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
  const [byPayer, setByPayer] = useState<ByPayer[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const online = useOnline();


  const api = baseUrl.replace(/\/$/, "");

  const fetchAll = useCallback(async () => {
    if (!api) {
      setError("同期先URLを入力してから集計してね");
      return;
    }

    // 日付範囲のバリデーション
    if (start > end) {
      setError("開始日は終了日より前である必要があります");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const qs = `start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;

      const [sRes, cRes, pRes, eRes] = await Promise.all([
        fetchWithTimeout(`${api}/summary?${qs}`, {}, 10000),
        fetchWithTimeout(`${api}/summary/by-category?${qs}`, {}, 10000),
        fetchWithTimeout(`${api}/summary/by-payer?${qs}`, {}, 10000),
        fetchWithTimeout(`${api}/summary/expenses?${qs}&limit=50&offset=0`, {}, 10000),
      ]);

      if (!sRes.ok) throw new Error("合計の取得に失敗");
      if (!cRes.ok) throw new Error("カテゴリ別の取得に失敗");
      if (!pRes.ok) throw new Error("支払者別の取得に失敗");
      if (!eRes.ok) throw new Error("明細の取得に失敗");

      const s: Summary = await sRes.json();
      const c: ByCategory[] = await cRes.json();
      const p: ByPayer[] = await pRes.json();
      const e: Expense[] = await eRes.json();

      setSummary(s);
      setByCategory(c);
      setByPayer(p);
      setExpenses(e);
    } catch (err: any) {
      setError(err?.message ?? "エラー");
    } finally {
      setLoading(false);
    }
  }, [api, start, end]);

  async function deleteExpense(id?: number) {
    if (!api) {
      setError("同期先URLを入力してね");
      return;
    }
    if (!id) return;
  
    setConfirmDialog({
      message: "この明細を削除しますか？\n\n論理削除されます。この操作は取り消せません。",
      onConfirm: async () => {
        setLoading(true);
        setError(null);
        try {
          const res = await fetchWithTimeout(`${api}/expenses/${id}`, { method: "DELETE" }, 10000);
          if (!res.ok) {
            const text = await res.text();
            throw new Error(`削除に失敗: HTTP ${res.status}\n${text}`);
          }
    
          // 削除成功後に画面を更新
          await fetchAll();
        } catch (err: any) {
          setError(err?.message ?? "削除エラー");
          // エラー時は画面を再取得して整合性を保つ
          await fetchAll();
        } finally {
          setLoading(false);
          setConfirmDialog(null);
        }
      },
    });
  }
  

  // baseUrl が入ったら自動で1回取得（QRから入ってきた時に便利）
  useEffect(() => {
    if (api) {
      fetchAll();
    }
  }, [api, fetchAll]);

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
    <div style={{ maxWidth: 520, margin: "0 auto", padding: 8, fontFamily: "system-ui" }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, color: "#1f2937" }}>集計</h2>

      {!api && (
        <div style={{ 
          background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)", 
          border: "2px solid #f59e0b", 
          padding: 14, 
          borderRadius: 12, 
          marginBottom: 16,
          color: "#92400e",
          fontWeight: 500,
        }}>
          同期先URLが未設定です（上の入力欄に <b>http://192.168.x.x:8000</b> を入れてね）
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 14, color: "#374151", fontWeight: 600 }}>開始日</label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            style={{ 
              width: "100%", 
              padding: 12, 
              borderRadius: 12, 
              border: "2px solid #e0e0e0",
              fontSize: 15,
              transition: "border-color 0.2s",
            }}
          />
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 14, color: "#374151", fontWeight: 600 }}>終了日</label>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            style={{ 
              width: "100%", 
              padding: 12, 
              borderRadius: 12, 
              border: "2px solid #e0e0e0",
              fontSize: 15,
              transition: "border-color 0.2s",
            }}
          />
        </div>

        <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={setThisMonth} style={btnStyle}>今月</button>
          <button onClick={setLastMonth} style={btnStyle}>先月</button>
          <button onClick={setLast7Days} style={btnStyle}>直近7日</button>
          <button 
            onClick={fetchAll} 
            style={{ 
              ...btnStyle, 
              fontWeight: 700,
              background: loading || !api 
                ? "#e5e7eb" 
                : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: loading || !api ? "#9ca3af" : "#fff",
              border: loading || !api ? "2px solid #d1d5db" : "2px solid #667eea",
              boxShadow: loading || !api ? "none" : "0 2px 8px rgba(102, 126, 234, 0.4)",
            }} 
            disabled={loading || !api}
          >
            {loading ? "取得中..." : "集計する"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ 
          background: "linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)", 
          border: "2px solid #ef4444", 
          padding: 14, 
          borderRadius: 12, 
          marginBottom: 16,
          color: "#991b1b",
          fontWeight: 500,
        }}>
          {error}
        </div>
      )}

      <div style={cardStyle}>
        <div style={{ fontSize: 12, color: "#666" }}>
          {start} 〜 {end}
        </div>
        <div
          style={{
            fontSize: 32,
            fontWeight: 800,
            marginTop: 8,
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          ¥{totalText}
        </div>
        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6, fontWeight: 500 }}>合計（支出）</div>
      </div>

      <div style={{ height: 12 }} />

      <div style={cardStyle}>
        <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 16, color: "#1f2937" }}>カテゴリ別</div>
        {byCategory.length === 0 ? (
          <div style={{ color: "#9ca3af", fontSize: 14, fontStyle: "italic" }}>データなし</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {byCategory.slice(0, 10).map((c, idx) => {
              const colors = [
                "#667eea",
                "#f5576c",
                "#4facfe",
                "#43e97b",
                "#fa709a",
              ];
              const color = colors[idx % colors.length];
              return (
                <div 
                  key={c.category} 
                  style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    gap: 8,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "rgba(102, 126, 234, 0.05)",
                    border: "1px solid rgba(102, 126, 234, 0.1)",
                  }}
                >
                  <div style={{ color: "#1f2937", fontWeight: 600 }}>{c.category}</div>
                  <div style={{ 
                    fontWeight: 700, 
                    color: color,
                  }}>
                    ¥{c.total.toLocaleString("ja-JP")}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ height: 12 }} />

      <div style={cardStyle}>
        <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 16, color: "#1f2937" }}>支払者別</div>
        {byPayer.length === 0 ? (
          <div style={{ color: "#9ca3af", fontSize: 14, fontStyle: "italic" }}>データなし</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {byPayer.map((p, idx) => {
              const colors = [
                "#667eea",
                "#f5576c",
                "#4facfe",
                "#43e97b",
                "#fa709a",
              ];
              const color = colors[idx % colors.length];
              const payerName = p.paid_by && (p.paid_by === "me" || p.paid_by === "her") 
                ? payerLabel[p.paid_by] 
                : p.paid_by ?? "未設定";
              return (
                <div 
                  key={p.paid_by ?? "null"} 
                  style={{ 
                    display: "flex", 
                    justifyContent: "space-between", 
                    gap: 8,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "rgba(102, 126, 234, 0.05)",
                    border: "1px solid rgba(102, 126, 234, 0.1)",
                  }}
                >
                  <div style={{ color: "#1f2937", fontWeight: 600 }}>{payerName}</div>
                  <div style={{ 
                    fontWeight: 700, 
                    color: color,
                  }}>
                    ¥{p.total.toLocaleString("ja-JP")}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ height: 12 }} />

      <div style={cardStyle}>
        <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 16, color: "#1f2937" }}>明細（最新50件）</div>
        {expenses.length === 0 ? (
          <div style={{ color: "#9ca3af", fontSize: 14, fontStyle: "italic" }}>データなし</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {expenses.map((e) => (
              <div
                key={e.id ?? `${e.date}-${e.amount}-${e.category}`}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)",
                  border: "2px solid #e5e7eb",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{e.date}</div>
                    <div style={{ fontWeight: 700, color: "#1f2937", marginBottom: 4 }}>{e.category}</div>
                    {e.note ? <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{e.note}</div> : null}
                  </div>
                  <div style={{ display: "grid", justifyItems: "end", gap: 8 }}>
                    <div style={{ 
                      fontWeight: 800, 
                      fontSize: 18,
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}>
                      ¥{e.amount.toLocaleString("ja-JP")}
                    </div>

                    <button
                      onClick={() => deleteExpense(e.id)}
                      disabled={loading || !e.id || !online}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        border: "2px solid #ef4444",
                        background: loading || !online ? "#f3f4f6" : "#fee2e2",
                        color: loading || !online ? "#9ca3af" : "#dc2626",
                        fontSize: 12,
                        fontWeight: 600,
                        opacity: loading || !online ? 0.6 : 1,
                        cursor: loading || !online ? "not-allowed" : "pointer",
                        transition: "all 0.2s",
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

      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.3)",
  borderRadius: 16,
  padding: 16,
  background: "#fff",
  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
};

const btnStyle: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 12,
  border: "2px solid #e0e0e0",
  background: "#f8f9fa",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
  color: "#374151",
  transition: "all 0.2s",
};
