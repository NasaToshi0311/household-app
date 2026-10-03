import { useEffect, useMemo, useState } from "react";
import { payerLabel } from "../constants/payer";
import { sortCategoriesByOrder } from "../constants/category";
import { getExpensesByRange, type Expense } from "../db";
import { addDays, formatDateLabel, formatDateTimeLabel, monthRange, todayStr } from "../utils/date";
import * as S from "../ui/styles";

type Props = {
  /** データが変わるたびに増える値（同期・編集・削除後に再集計するため） */
  dataVersion: number;
  lastSyncedAt: string | null;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
};

type Breakdown = { key: string; label: string; total: number };

const PAGE_SIZE = 50;

function sum(items: Expense[]) {
  return items.reduce((acc, e) => acc + e.amount, 0);
}

function yen(n: number) {
  return `¥${n.toLocaleString("ja-JP")}`;
}

export default function SummaryPage({ dataVersion, lastSyncedAt, onEdit, onDelete }: Props) {
  const [mode, setMode] = useState<"month" | "custom">("month");
  const [monthOffset, setMonthOffset] = useState(0);
  const [customStart, setCustomStart] = useState(() => monthRange(new Date()).start);
  const [customEnd, setCustomEnd] = useState(() => todayStr());

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [prevTotal, setPrevTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterPayer, setFilterPayer] = useState<string | null>(null);
  // 期間やフィルタを変えたら表示件数を戻すため、条件ごとに件数を持つ
  const [paging, setPaging] = useState({ key: "", count: PAGE_SIZE });

  const monthBase = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + monthOffset, 1);
  }, [monthOffset]);

  const { start, end } = mode === "month" ? monthRange(monthBase) : { start: customStart, end: customEnd };

  // 期間・データ変更時に再集計
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(start) || !datePattern.test(end)) {
        setError("日付を選択してください");
        return;
      }
      if (start > end) {
        setError("開始日は終了日より前にしてください");
        return;
      }

      try {
        const items = await getExpensesByRange(start, end);
        // 前月比（月表示のときのみ）
        let prev: number | null = null;
        if (mode === "month") {
          const p = monthRange(monthBase, -1);
          prev = sum(await getExpensesByRange(p.start, p.end));
        }
        if (cancelled) return;
        setError(null);
        setExpenses(items);
        setPrevTotal(prev);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "集計に失敗しました");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [start, end, mode, monthBase, dataVersion]);

  const listKey = `${start}|${end}|${filterCategory}|${filterPayer}`;
  const visibleCount = paging.key === listKey ? paging.count : PAGE_SIZE;

  const total = useMemo(() => sum(expenses), [expenses]);

  // カテゴリ別は支払者フィルタを、支払者別はカテゴリフィルタを反映して集計（組み合わせて絞り込める）
  const byCategory = useMemo<Breakdown[]>(() => {
    const map = new Map<string, number>();
    expenses
      .filter((e) => !filterPayer || e.paid_by === filterPayer)
      .forEach((e) => map.set(e.category, (map.get(e.category) ?? 0) + e.amount));
    return sortCategoriesByOrder(
      Array.from(map, ([category, t]) => ({ category, total: t }))
    ).map((c) => ({ key: c.category, label: c.category, total: c.total }));
  }, [expenses, filterPayer]);

  const byPayer = useMemo<Breakdown[]>(() => {
    const map = new Map<string, number>();
    expenses
      .filter((e) => !filterCategory || e.category === filterCategory)
      .forEach((e) => map.set(e.paid_by, (map.get(e.paid_by) ?? 0) + e.amount));
    return Array.from(map, ([paid_by, t]) => ({
      key: paid_by,
      label: payerLabel[paid_by as keyof typeof payerLabel] ?? paid_by,
      total: t,
    })).sort((a, b) => b.total - a.total);
  }, [expenses, filterCategory]);

  const filtered = useMemo(() => {
    return expenses
      .filter((e) => !filterCategory || e.category === filterCategory)
      .filter((e) => !filterPayer || e.paid_by === filterPayer)
      .sort((a, b) => b.date.localeCompare(a.date) || b.updated_at.localeCompare(a.updated_at));
  }, [expenses, filterCategory, filterPayer]);

  const filteredTotal = useMemo(() => sum(filtered), [filtered]);
  const isFiltered = !!(filterCategory || filterPayer);

  // 日付ごとにまとめる（表示件数分のみ）。日ごとの合計は表示外の明細も含めて計算
  const dayGroups = useMemo(() => {
    const dayTotals = new Map<string, number>();
    filtered.forEach((e) => dayTotals.set(e.date, (dayTotals.get(e.date) ?? 0) + e.amount));

    const groups: { date: string; total: number; items: Expense[] }[] = [];
    for (const e of filtered.slice(0, visibleCount)) {
      const last = groups[groups.length - 1];
      if (last && last.date === e.date) {
        last.items.push(e);
      } else {
        groups.push({ date: e.date, total: dayTotals.get(e.date) ?? 0, items: [e] });
      }
    }
    return groups;
  }, [filtered, visibleCount]);

  function setQuickRange(kind: "7d" | "30d" | "year") {
    const today = todayStr();
    if (kind === "7d") setCustomStart(addDays(today, -6));
    if (kind === "30d") setCustomStart(addDays(today, -29));
    if (kind === "year") setCustomStart(`${today.slice(0, 4)}-01-01`);
    setCustomEnd(today);
  }

  const monthLabel = `${monthBase.getFullYear()}年${monthBase.getMonth() + 1}月`;
  const diff = prevTotal !== null ? total - prevTotal : null;

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "#1f2937" }}>集計</h2>
        <button
          onClick={() => setMode(mode === "month" ? "custom" : "month")}
          style={{ ...linkBtn }}
        >
          {mode === "month" ? "期間を指定する" : "月ごとの表示に戻る"}
        </button>
      </div>

      {mode === "month" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <button onClick={() => setMonthOffset(monthOffset - 1)} style={navBtn} aria-label="前の月">
            ◀
          </button>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#1f2937" }}>{monthLabel}</div>
            {monthOffset !== 0 && (
              <button onClick={() => setMonthOffset(0)} style={{ ...linkBtn, fontSize: 12 }}>
                今月に戻る
              </button>
            )}
          </div>
          <button onClick={() => setMonthOffset(monthOffset + 1)} style={navBtn} aria-label="次の月">
            ▶
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          <label style={labelStyle}>
            開始日
            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} style={S.input} />
          </label>
          <label style={labelStyle}>
            終了日
            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} style={S.input} />
          </label>
          <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setQuickRange("7d")} style={S.btn}>直近7日</button>
            <button onClick={() => setQuickRange("30d")} style={S.btn}>直近30日</button>
            <button onClick={() => setQuickRange("year")} style={S.btn}>今年</button>
          </div>
        </div>
      )}

      {error && (
        <div style={{ ...S.warningBox, marginBottom: 12 }} role="alert">
          {error}
        </div>
      )}

      <div style={cardStyle}>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          {formatDateLabel(start)} 〜 {formatDateLabel(end)}
        </div>
        <div style={{ fontSize: 32, fontWeight: 800, marginTop: 4, color: "#1f2937" }}>{yen(total)}</div>
        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2, fontWeight: 500 }}>
          合計（{expenses.length}件）
        </div>
        {diff !== null && prevTotal !== null && prevTotal > 0 && (
          <div style={{ fontSize: 13, marginTop: 6, fontWeight: 600, color: diff > 0 ? "#dc2626" : "#16a34a" }}>
            先月より {yen(Math.abs(diff))} {diff > 0 ? "多い" : diff < 0 ? "少ない" : "（同じ）"}
            <span style={{ color: "#6b7280", fontWeight: 500 }}>（先月 {yen(prevTotal)}）</span>
          </div>
        )}
        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
          {lastSyncedAt
            ? `最終同期 ${formatDateTimeLabel(lastSyncedAt)} 時点のデータ`
            : "まだ同期していません。同期すると過去のデータも表示されます"}
        </div>
      </div>

      <div style={{ height: 12 }} />

      <BreakdownCard
        title="カテゴリ別"
        items={byCategory}
        selected={filterCategory}
        onSelect={(key) => setFilterCategory(filterCategory === key ? null : key)}
      />

      <div style={{ height: 12 }} />

      <BreakdownCard
        title="支払者別"
        items={byPayer}
        selected={filterPayer}
        onSelect={(key) => setFilterPayer(filterPayer === key ? null : key)}
      />

      <div style={{ height: 12 }} />

      <div style={cardStyle}>
        <div style={{ fontWeight: 700, fontSize: 16, color: "#1f2937", marginBottom: 12 }}>
          明細（{filtered.length}件）
        </div>

        {isFiltered && (
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
              gap: 8,
            }}
          >
            <div style={{ fontSize: 13, color: "#1e40af", fontWeight: 500 }}>
              {[
                filterCategory && `カテゴリ: ${filterCategory}`,
                filterPayer && `支払者: ${payerLabel[filterPayer as keyof typeof payerLabel] ?? filterPayer}`,
              ]
                .filter(Boolean)
                .join(" / ")}
              <div style={{ fontWeight: 700 }}>絞り込み合計 {yen(filteredTotal)}</div>
            </div>
            <button
              onClick={() => {
                setFilterCategory(null);
                setFilterPayer(null);
              }}
              style={{ ...S.btn, padding: "4px 12px", fontSize: 12, color: "#3b82f6", border: "1px solid #3b82f6" }}
            >
              解除
            </button>
          </div>
        )}

        {filtered.length === 0 ? (
          <div style={{ color: "#9ca3af", fontSize: 14, fontStyle: "italic" }}>データなし</div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {dayGroups.map((g) => (
              <div key={g.date}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#4b5563",
                    borderBottom: "1px solid #e5e7eb",
                    paddingBottom: 4,
                    marginBottom: 8,
                  }}
                >
                  <span>{formatDateLabel(g.date)}</span>
                  <span>{yen(g.total)}</span>
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {g.items.map((e) => (
                    <ExpenseRow key={e.client_uuid} expense={e} onEdit={onEdit} onDelete={onDelete} />
                  ))}
                </div>
              </div>
            ))}
            {filtered.length > visibleCount && (
              <button onClick={() => setPaging({ key: listKey, count: visibleCount + PAGE_SIZE })} style={{ ...S.btn, width: "100%" }}>
                さらに表示（残り {filtered.length - visibleCount}件）
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BreakdownCard({
  title,
  items,
  selected,
  onSelect,
}: {
  title: string;
  items: Breakdown[];
  selected: string | null;
  onSelect: (key: string) => void;
}) {
  const total = items.reduce((acc, i) => acc + i.total, 0);

  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: "#1f2937" }}>{title}</div>
        {items.length > 0 && <div style={{ fontSize: 11, color: "#9ca3af" }}>タップで絞り込み</div>}
      </div>
      {items.length === 0 ? (
        <div style={{ color: "#9ca3af", fontSize: 14, fontStyle: "italic" }}>データなし</div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {items.map((c) => {
            const isSelected = selected === c.key;
            const pct = total > 0 ? Math.round((c.total / total) * 100) : 0;
            return (
              <button
                key={c.key}
                onClick={() => onSelect(c.key)}
                aria-pressed={isSelected}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: isSelected ? "#eff6ff" : "#f9fafb",
                  border: isSelected ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                  cursor: "pointer",
                  font: "inherit",
                  color: "#1f2937",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{c.label}</span>
                  <span>
                    <span style={{ fontSize: 12, color: "#6b7280", marginRight: 8 }}>{pct}%</span>
                    <span style={{ fontWeight: 800, fontSize: 16 }}>{yen(c.total)}</span>
                  </span>
                </div>
                <div style={{ height: 6, background: "#e5e7eb", borderRadius: 3, marginTop: 6, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: "#16a34a", borderRadius: 3 }} />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ExpenseRow({
  expense: e,
  onEdit,
  onDelete,
}: {
  expense: Expense;
  onEdit: (e: Expense) => void;
  onDelete: (e: Expense) => void;
}) {
  return (
    <div
      onClick={() => onEdit(e)}
      style={{
        padding: 12,
        borderRadius: 12,
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        cursor: "pointer",
        display: "flex",
        justifyContent: "space-between",
        gap: 8,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: "#1f2937" }}>
          {e.category}
          {e.status === "pending" && (
            <span
              style={{
                marginLeft: 8,
                fontSize: 11,
                fontWeight: 600,
                color: "#92400e",
                background: "#fef3c7",
                border: "1px solid #f59e0b",
                borderRadius: 6,
                padding: "1px 6px",
              }}
            >
              未送信
            </span>
          )}
        </div>
        {e.note ? (
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2, overflowWrap: "anywhere" }}>{e.note}</div>
        ) : null}
        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{payerLabel[e.paid_by]}</div>
      </div>
      <div style={{ display: "grid", justifyItems: "end", gap: 6 }}>
        <div style={{ fontWeight: 800, fontSize: 17, color: "#1f2937" }}>{yen(e.amount)}</div>
        <button
          onClick={(ev) => {
            ev.stopPropagation();
            onDelete(e);
          }}
          style={{ ...S.btnDanger, padding: "4px 10px", fontSize: 12 }}
        >
          削除
        </button>
      </div>
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

const navBtn: React.CSSProperties = {
  ...S.btn,
  padding: "10px 16px",
  fontSize: 16,
};

const linkBtn: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#16a34a",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  padding: 4,
};

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  fontSize: 14,
  color: "#1f2937",
  fontWeight: 600,
};
