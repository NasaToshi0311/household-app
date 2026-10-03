import { useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import type { Expense, ExpenseInput } from "../db";
import { payerLabel, type PaidBy } from "../constants/payer";
import { CATEGORY_ORDER } from "../constants/category";
import { addDays, formatDateLabel, todayStr } from "../utils/date";
import * as S from "../ui/styles";

type Props = {
  /** 編集時は対象の明細を渡す（未指定なら新規入力） */
  initial?: Expense | null;
  onSubmit: (input: ExpenseInput) => Promise<void> | void;
  onCancel?: () => void;
};

const LS_LAST_PAID_BY = "household_last_paid_by";

function loadLastPaidBy(): PaidBy {
  try {
    return localStorage.getItem(LS_LAST_PAID_BY) === "her" ? "her" : "me";
  } catch {
    return "me";
  }
}

function saveLastPaidBy(value: PaidBy) {
  try {
    localStorage.setItem(LS_LAST_PAID_BY, value);
  } catch {
    // 保存できなくても入力には影響しない
  }
}

export default function ExpenseForm({ initial, onSubmit, onCancel }: Props) {
  const isEdit = !!initial;
  const [date, setDate] = useState(initial?.date ?? todayStr());
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [category, setCategory] = useState<string>(initial?.category ?? CATEGORY_ORDER[0]);
  const [note, setNote] = useState(initial?.note ?? "");
  const [paidBy, setPaidBy] = useState<PaidBy>(initial?.paid_by ?? loadLastPaidBy());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const amountRef = useRef<HTMLInputElement>(null);

  const today = todayStr();
  const yesterday = addDays(today, -1);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError("日付を選択してください");
      return;
    }

    if (!amount) {
      setError("金額を入力してください");
      amountRef.current?.focus();
      return;
    }

    const amountNum = Number(amount);
    if (!Number.isInteger(amountNum) || amountNum <= 0) {
      setError("金額は1以上の整数で入力してください");
      return;
    }

    if (amountNum > 1000000000) {
      setError("金額は10億円以下で入力してください");
      return;
    }

    if (note.length > 200) {
      setError("メモは200文字以内で入力してください");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        client_uuid: initial?.client_uuid ?? uuidv4(),
        date,
        amount: amountNum,
        category,
        note: note.trim() || undefined,
        paid_by: paidBy,
      });

      if (!isEdit) {
        saveLastPaidBy(paidBy);
        // 続けて入力しやすいよう、日付・カテゴリ・支払者は残して金額とメモだけクリア
        setAmount("");
        setNote("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const fieldStyle: React.CSSProperties = { ...S.input, padding: 14, marginBottom: 12 };

  const chip = (selected: boolean): React.CSSProperties => ({
    ...S.btn,
    padding: "10px 4px",
    fontSize: 14,
    background: selected ? "#16a34a" : "#ffffff",
    color: selected ? "#ffffff" : "#1f2937",
    border: selected ? "2px solid #16a34a" : "2px solid #e5e7eb",
  });

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: "#1f2937" }}>
        {isEdit ? "明細を編集" : "入力"}
      </h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="日付"
          style={{ ...S.input, padding: 12, flex: 1, minWidth: 0 }}
        />
        <button type="button" onClick={() => setDate(today)} style={chipSmall(date === today)}>
          今日
        </button>
        <button type="button" onClick={() => setDate(yesterday)} style={chipSmall(date === yesterday)}>
          昨日
        </button>
      </div>
      {date && date !== today && date !== yesterday && /^\d{4}-\d{2}-\d{2}$/.test(date) && (
        <div style={{ ...S.muted, marginTop: -6, marginBottom: 12 }}>{formatDateLabel(date)} の支出として登録します</div>
      )}

      <input
        ref={amountRef}
        type="number"
        step="1"
        min="1"
        max="1000000000"
        placeholder="金額（円）"
        value={amount}
        onChange={(e) => {
          // 小数点やカンマを除去（整数のみ許可）
          setAmount(e.target.value.replace(/[.,]/g, ""));
          setError(null);
        }}
        inputMode="numeric"
        enterKeyHint="done"
        aria-label="金額"
        style={{ ...fieldStyle, fontSize: 20, fontWeight: 700 }}
      />

      <div
        role="radiogroup"
        aria-label="カテゴリ"
        style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}
      >
        {CATEGORY_ORDER.map((cat) => (
          <button
            key={cat}
            type="button"
            role="radio"
            aria-checked={category === cat}
            onClick={() => setCategory(cat)}
            style={chip(category === cat)}
          >
            {cat}
          </button>
        ))}
        {/* 定義外のカテゴリ（過去データ）を編集する場合も選択状態を保てるように表示 */}
        {!CATEGORY_ORDER.includes(category as (typeof CATEGORY_ORDER)[number]) && (
          <button type="button" role="radio" aria-checked style={chip(true)}>
            {category}
          </button>
        )}
      </div>

      <input
        placeholder="メモ（任意）"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={200}
        enterKeyHint="done"
        aria-label="メモ"
        style={fieldStyle}
      />

      <div
        role="radiogroup"
        aria-label="支払者"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}
      >
        {(Object.keys(payerLabel) as PaidBy[]).map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={paidBy === p}
            onClick={() => setPaidBy(p)}
            style={chip(paidBy === p)}
          >
            {payerLabel[p]}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ ...S.warningBox, marginBottom: 12, fontSize: 14 }} role="alert">
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        {onCancel && (
          <button type="button" onClick={onCancel} style={{ ...S.btn, padding: 14, flex: 1 }}>
            キャンセル
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          style={{ ...S.btnPrimary, padding: 14, fontSize: 16, flex: 2, opacity: submitting ? 0.6 : 1 }}
        >
          {isEdit ? "更新する" : "追加"}
        </button>
      </div>
    </form>
  );
}

function chipSmall(selected: boolean): React.CSSProperties {
  return {
    ...S.btn,
    padding: "10px 12px",
    flexShrink: 0,
    background: selected ? "#f0fdf4" : "#ffffff",
    color: selected ? "#16a34a" : "#1f2937",
    border: selected ? "2px solid #16a34a" : "2px solid #e5e7eb",
  };
}
