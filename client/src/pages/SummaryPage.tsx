import { useEffect, useMemo, useState, useCallback } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import { payerLabel } from "../constants/payer";
import { getExpensesByRange, getPendingCount, markDeleteExpense, type Expense } from "../db";

type Summary = { start: string; end: string; total: number };
type ByCategory = { category: string; total: number };
type ByPayer = { paid_by: string | null; total: number };

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

export default function SummaryPage() {
  const today = useMemo(() => new Date(), []);
  const [start, setStart] = useState<string>(ymd(startOfMonth(today)));
  const [end, setEnd] = useState<string>(ymd(endOfMonth(today)));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [byCategory, setByCategory] = useState<ByCategory[]>([]);
  const [byPayer, setByPayer] = useState<ByPayer[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // ローカルデータから集計を計算
  const calculateLocalSummary = useCallback(async () => {
    // 日付範囲のバリデーション
    if (start > end) {
      setError("開始日は終了日より前である必要があります");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // IndexedDBから期間で絞り込んだデータを取得
      const filtered = await getExpensesByRange(start, end);
      const pending = await getPendingCount();

      const total = filtered.reduce((sum, item) => sum + item.amount, 0);

      const categoryMap = new Map<string, number>();
      const payerMap = new Map<string | null, number>();

      filtered.forEach((item) => {
        categoryMap.set(item.category, (categoryMap.get(item.category) || 0) + item.amount);
        payerMap.set(item.paid_by, (payerMap.get(item.paid_by) || 0) + item.amount);
      });

      const byCategory: ByCategory[] = Array.from(categoryMap.entries())
        .map(([category, total]) => ({ category, total }))
        .sort((a, b) => b.total - a.total);

      const byPayer: ByPayer[] = Array.from(payerMap.entries())
        .map(([paid_by, total]) => ({ paid_by, total }))
        .sort((a, b) => b.total - a.total);

      const expensesList: Expense[] = filtered
        .sort((a, b) => {
          const dateCompare = b.date.localeCompare(a.date);
          if (dateCompare !== 0) return dateCompare;
          return b.client_uuid.localeCompare(a.client_uuid);
        })
        .slice(0, 50);

      setSummary({ start, end, total });
      setByCategory(byCategory);
      setByPayer(byPayer);
      setExpenses(expensesList);
      setPendingCount(pending);
    } catch (err: any) {
      setError(err?.message ?? "エラー");
    } finally {
      setLoading(false);
    }
  }, [start, end]);

  async function deleteExpense(clientUuid: string) {
    if (!clientUuid) return;

    setConfirmDialog({
      message: "この明細を削除しますか？\n\n削除後、次回同期時にサーバーに反映されます。",
      onConfirm: async () => {
        setLoading(true);
        setError(null);
        try {
          await markDeleteExpense(clientUuid);
          await calculateLocalSummary();
        } catch (err: any) {
          setError(err?.message ?? "削除エラー");
        } finally {
          setLoading(false);
          setConfirmDialog(null);
        }
      },
    });
  }

  // 初期表示とstart/end変更時に集計
  useEffect(() => {
    calculateLocalSummary();
  }, [calculateLocalSummary]);

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

      <div
        style={{
          background: "#eff6ff",
          border: "2px solid #93c5fd",
          padding: 14,
          borderRadius: 12,
          marginBottom: 16,
          color: "#1e40af",
          fontWeight: 500,
        }}
      >
        ローカル集計（未同期含む）
        {pendingCount > 0 && (
          <div style={{ marginTop: 8, fontSize: 14, fontWeight: 600 }}>
            未同期件数: {pendingCount}件
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 14, color: "#1f2937", fontWeight: 600 }}>開始日</label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "2px solid #e5e7eb",
              fontSize: 15,
              color: "#1f2937",
              transition: "border-color 0.2s",
            }}
          />
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <label style={{ fontSize: 14, color: "#1f2937", fontWeight: 600 }}>終了日</label>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "2px solid #e5e7eb",
              fontSize: 15,
              color: "#1f2937",
              transition: "border-color 0.2s",
            }}
          />
        </div>

        <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={setThisMonth} style={btnStyle}>
            今月
          </button>
          <button onClick={setLastMonth} style={btnStyle}>
            先月
          </button>
          <button onClick={setLast7Days} style={btnStyle}>
            直近7日
          </button>
          <button
            onClick={calculateLocalSummary}
            style={{
              ...btnStyle,
              fontWeight: 700,
              background: loading ? "#e5e7eb" : "#16a34a",
              color: loading ? "#9ca3af" : "#ffffff",
              border: loading ? "2px solid #d1d5db" : "2px solid #16a34a",
              boxShadow: loading ? "none" : "0 2px 8px rgba(22, 163, 74, 0.3)",
            }}
            disabled={loading}
          >
            {loading ? "集計中..." : "集計する"}
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "#fee2e2",
            border: "2px solid #ef4444",
            padding: 14,
            borderRadius: 12,
            marginBottom: 16,
            color: "#991b1b",
            fontWeight: 500,
          }}
        >
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
            color: "#1f2937",
          }}
        >
          ¥{totalText}
        </div>
        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6, fontWeight: 500 }}>
          合計（支出）
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div style={cardStyle}>
        <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 16, color: "#1f2937" }}>
          カテゴリ別
        </div>
        {byCategory.length === 0 ? (
          <div style={{ color: "#9ca3af", fontSize: 14, fontStyle: "italic" }}>データなし</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {byCategory.slice(0, 10).map((c) => {
              return (
                <div
                  key={c.category}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div style={{ color: "#1f2937", fontWeight: 600, fontSize: 15 }}>{c.category}</div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 16,
                      color: "#16a34a",
                      padding: "4px 10px",
                      background: "#f0fdf4",
                      borderRadius: 8,
                      border: "1px solid #bbf7d0",
                    }}
                  >
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
        <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 16, color: "#1f2937" }}>
          支払者別
        </div>
        {byPayer.length === 0 ? (
          <div style={{ color: "#9ca3af", fontSize: 14, fontStyle: "italic" }}>データなし</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {byPayer.map((p) => {
              const payerName =
                p.paid_by && (p.paid_by === "me" || p.paid_by === "her")
                  ? payerLabel[p.paid_by]
                  : p.paid_by ?? "未設定";
              return (
                <div
                  key={p.paid_by ?? "null"}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div style={{ color: "#1f2937", fontWeight: 600, fontSize: 15 }}>{payerName}</div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 16,
                      color: "#16a34a",
                      padding: "4px 10px",
                      background: "#f0fdf4",
                      borderRadius: 8,
                      border: "1px solid #bbf7d0",
                    }}
                  >
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
        <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 16, color: "#1f2937" }}>
          明細（最新50件）
        </div>
        {expenses.length === 0 ? (
          <div style={{ color: "#9ca3af", fontSize: 14, fontStyle: "italic" }}>データなし</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {expenses.map((e, idx) => {
              return (
                <div
                  key={e.client_uuid ?? `${e.date}-${e.amount}-${e.category}-${idx}`}
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    background: "#ffffff",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                        {e.date}
                      </div>
                      <div style={{ fontWeight: 700, color: "#1f2937", marginBottom: 4 }}>
                        {e.category}
                      </div>
                      {e.note ? (
                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{e.note}</div>
                      ) : null}
                    </div>
                    <div style={{ display: "grid", justifyItems: "end", gap: 8 }}>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: 18,
                          color: "#1f2937",
                        }}
                      >
                        ¥{e.amount.toLocaleString("ja-JP")}
                      </div>

                      <button
                        onClick={() => {
                          deleteExpense(e.client_uuid);
                        }}
                        disabled={loading}
                        style={{
                          padding: "6px 12px",
                          borderRadius: 8,
                          border: "2px solid #ef4444",
                          background: loading ? "#f3f4f6" : "#fee2e2",
                          color: loading ? "#9ca3af" : "#dc2626",
                          fontSize: 12,
                          fontWeight: 600,
                          opacity: loading ? 0.6 : 1,
                          cursor: loading ? "not-allowed" : "pointer",
                          transition: "all 0.2s",
                        }}
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 16,
  background: "#fff",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

const btnStyle: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 12,
  border: "2px solid #e5e7eb",
  background: "#ffffff",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
  color: "#1f2937",
  transition: "all 0.2s",
};
