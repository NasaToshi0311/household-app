import { useEffect, useMemo, useState, useCallback } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import { payerLabel } from "../constants/payer";
import { sortCategoriesByOrder } from "../constants/category";
import { getExpensesByRange, markDeleteExpense, type Expense } from "../db";
import { formatDate, startOfMonth, endOfMonth } from "../utils/date";

type Summary = { start: string; end: string; total: number };
type ByCategory = { category: string; total: number };
type ByPayer = { paid_by: string | null; total: number };

export default function SummaryPage() {
  const today = useMemo(() => new Date(), []);
  const [start, setStart] = useState<string>(formatDate(startOfMonth(today)));
  const [end, setEnd] = useState<string>(formatDate(endOfMonth(today)));
  const [expenseLimit, setExpenseLimit] = useState<number>(20);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [byCategory, setByCategory] = useState<ByCategory[]>([]);
  const [byPayer, setByPayer] = useState<ByPayer[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterPayer, setFilterPayer] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // ローカルデータから集計を計算
  const calculateLocalSummary = useCallback(async () => {
    // 日付形式のバリデーション
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(start) || !datePattern.test(end)) {
      setError("日付の形式が正しくありません（YYYY-MM-DD形式で入力してください）");
      return;
    }

    // 有効な日付かチェック
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      setError("無効な日付が入力されています");
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
      // IndexedDBから期間で絞り込んだデータを取得
      const filtered = await getExpensesByRange(start, end);

      const total = filtered.reduce((sum, item) => sum + item.amount, 0);

      const categoryMap = new Map<string, number>();
      const payerMap = new Map<string | null, number>();

      filtered.forEach((item) => {
        categoryMap.set(item.category, (categoryMap.get(item.category) || 0) + item.amount);
        payerMap.set(item.paid_by, (payerMap.get(item.paid_by) || 0) + item.amount);
      });

      const byCategory: ByCategory[] = sortCategoriesByOrder(
        Array.from(categoryMap.entries()).map(([category, total]) => ({ category, total }))
      );

      const byPayer: ByPayer[] = Array.from(payerMap.entries())
        .map(([paid_by, total]) => ({ paid_by, total }))
        .sort((a, b) => b.total - a.total);

      // 日付の降順（最新が上）でソート、同じ日付の場合はclient_uuidで降順
      const expensesList: Expense[] = filtered
        .sort((a, b) => {
          const dateCompare = b.date.localeCompare(a.date);
          if (dateCompare !== 0) return dateCompare;
          return b.client_uuid.localeCompare(a.client_uuid);
        });

      setSummary({ start, end, total });
      setByCategory(byCategory);
      setByPayer(byPayer);
      setAllExpenses(expensesList);
    } catch (err: any) {
      setError(err?.message ?? "エラー");
    } finally {
      setLoading(false);
    }
  }, [start, end, expenseLimit]);

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

  // フィルタ適用
  useEffect(() => {
    let filtered = [...allExpenses];

    if (filterCategory) {
      filtered = filtered.filter((e) => e.category === filterCategory);
    }

    if (filterPayer) {
      filtered = filtered.filter((e) => e.paid_by === filterPayer);
    }

    // 日付の降順（最新が上）でソート、同じ日付の場合はclient_uuidで降順
    filtered.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.client_uuid.localeCompare(a.client_uuid);
    });

    setExpenses(filtered.slice(0, expenseLimit));
  }, [allExpenses, filterCategory, filterPayer, expenseLimit]);

  // カテゴリフィルタを設定
  const handleCategoryClick = (category: string) => {
    if (filterCategory === category) {
      setFilterCategory(null);
    } else {
      setFilterCategory(category);
      setFilterPayer(null); // 支払者フィルタをクリア
    }
  };

  // 支払者フィルタを設定
  const handlePayerClick = (paid_by: string | null) => {
    if (filterPayer === paid_by) {
      setFilterPayer(null);
    } else {
      setFilterPayer(paid_by);
      setFilterCategory(null); // カテゴリフィルタをクリア
    }
  };

  // フィルタをクリア
  const clearFilters = () => {
    setFilterCategory(null);
    setFilterPayer(null);
  };

  function setThisMonth() {
    const d = new Date();
    setStart(formatDate(startOfMonth(d)));
    setEnd(formatDate(endOfMonth(d)));
  }

  function setLastMonth() {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    setStart(formatDate(startOfMonth(d)));
    setEnd(formatDate(endOfMonth(d)));
  }

  function setLast7Days() {
    const d = new Date();
    const endD = new Date(d);
    const startD = new Date(d);
    startD.setDate(startD.getDate() - 6);
    setStart(formatDate(startD));
    setEnd(formatDate(endD));
  }

  const totalText = (summary?.total ?? 0).toLocaleString("ja-JP");

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: 8, fontFamily: "system-ui" }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, color: "#1f2937" }}>集計</h2>

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
              fontSize: 16, /* iOS Safariで自動ズームを防ぐため16px以上 */
              color: "#1f2937",
              transition: "border-color 0.2s",
              WebkitAppearance: "none",
              appearance: "none",
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
              fontSize: 16, /* iOS Safariで自動ズームを防ぐため16px以上 */
              color: "#1f2937",
              transition: "border-color 0.2s",
              WebkitAppearance: "none",
              appearance: "none",
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
              const isSelected = filterCategory === c.category;
              return (
                <div
                  key={c.category}
                  onClick={() => handleCategoryClick(c.category)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: isSelected ? "#eff6ff" : "#f9fafb",
                    border: isSelected ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                    cursor: "pointer",
                    transition: "all 0.2s",
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
              const isSelected = filterPayer === p.paid_by;
              return (
                <div
                  key={p.paid_by ?? "null"}
                  onClick={() => handlePayerClick(p.paid_by)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: isSelected ? "#eff6ff" : "#f9fafb",
                    border: isSelected ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                    cursor: "pointer",
                    transition: "all 0.2s",
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#1f2937" }}>
            明細（{filterCategory || filterPayer ? `フィルタ適用中: ${expenses.length}件` : `最新${expenseLimit}件`}）
          </div>
          <select
            value={expenseLimit}
            onChange={(e) => setExpenseLimit(Number(e.target.value))}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "2px solid #e5e7eb",
              background: "#ffffff",
              fontSize: 13,
              fontWeight: 600,
              color: "#1f2937",
              cursor: "pointer",
            }}
          >
            {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((num) => (
              <option key={num} value={num}>
                {num}件
              </option>
            ))}
          </select>
        </div>
        {(filterCategory || filterPayer) && (
          <div
            style={{
              marginBottom: 12,
              padding: "10px 14px",
              background: "#eff6ff",
              border: "1px solid #93c5fd",
              borderRadius: 8,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: 13, color: "#1e40af", fontWeight: 500 }}>
              {filterCategory && `カテゴリ: ${filterCategory}`}
              {filterPayer && `支払者: ${filterPayer && (filterPayer === "me" || filterPayer === "her") ? payerLabel[filterPayer] : filterPayer ?? "未設定"}`}
            </div>
            <button
              onClick={clearFilters}
              style={{
                padding: "4px 12px",
                borderRadius: 6,
                border: "1px solid #3b82f6",
                background: "#ffffff",
                color: "#3b82f6",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              フィルタ解除
            </button>
          </div>
        )}
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
  WebkitTapHighlightColor: "rgba(0, 0, 0, 0.1)",
  touchAction: "manipulation",
  WebkitUserSelect: "none",
  userSelect: "none",
};
