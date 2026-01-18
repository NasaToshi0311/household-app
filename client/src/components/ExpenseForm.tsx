import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import type { PendingExpense } from "../db";
import { payerLabel, type PaidBy } from "../constants/payer";

type Props = {
  onAdd: (item: PendingExpense) => Promise<void> | void;
};

export default function ExpenseForm({ onAdd }: Props) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("食費");
  const [note, setNote] = useState("");
  const [paidBy, setPaidBy] = useState<PaidBy>("me");

  async function handleAdd() {
    if (!amount) {
      alert("金額を入力してください");
      return;
    }

    // 小数点が含まれていないかチェック（整数のみ許可）
    if (amount.includes(".") || amount.includes(",")) {
      alert("金額は整数のみ入力してください（小数点は使用できません）");
      return;
    }

    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("金額は0より大きい数値を入力してください");
      return;
    }

    // 整数であることを確認（Number()は小数点を許可するため）
    if (!Number.isInteger(amountNum)) {
      alert("金額は整数のみ入力してください");
      return;
    }

    if (amountNum > 1000000000) {
      alert("金額は10億円以下で入力してください");
      return;
    }

    if (note && note.length > 200) {
      alert("メモは200文字以内で入力してください");
      return;
    }

    // 確実に整数に変換（サーバー側はint型を要求）
    const amountInt = Math.floor(amountNum);

    const item: PendingExpense = {
      client_uuid: uuidv4(),
      date: new Date().toISOString().slice(0, 10),
      amount: amountInt,
      category,
      note: note || undefined,
      paid_by: paidBy,
      op: "upsert",
    };

    await onAdd(item);
    setAmount("");
    setNote("");
  }

  return (
    <>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: "#1f2937" }}>入力</h2>

      <input
        type="number"
        step="1"
        min="1"
        max="1000000000"
        placeholder="金額"
        value={amount}
        onChange={(e) => {
          // 小数点入力を防ぐ（step="1"と組み合わせて）
          const value = e.target.value;
          // 空文字列は許可
          if (value === "") {
            setAmount("");
            return;
          }
          // 小数点やカンマを除去（整数のみ許可）
          const sanitized = value.replace(/[.,]/g, "");
          setAmount(sanitized);
        }}
        style={{ 
          width: "100%", 
          marginBottom: 12, 
          padding: 14, 
          borderRadius: 12, 
          border: "2px solid #e5e7eb",
          fontSize: 16,
          color: "#1f2937",
          transition: "border-color 0.2s",
        }}
      />

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        style={{ 
          width: "100%", 
          marginBottom: 12, 
          padding: 14, 
          borderRadius: 12, 
          border: "2px solid #e5e7eb",
          fontSize: 15,
          background: "#fff",
          color: "#1f2937",
          cursor: "pointer",
          transition: "border-color 0.2s",
        }}
      >
        <option>食費</option>
        <option>外食</option>
        <option>日用品</option>
        <option>住居・光熱費</option>
        <option>交通費</option>
        <option>その他</option>
      </select>

      <input
        placeholder="メモ（任意）"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        style={{ 
          width: "100%", 
          marginBottom: 12, 
          padding: 14, 
          borderRadius: 12, 
          border: "2px solid #e5e7eb",
          fontSize: 15,
          color: "#1f2937",
          transition: "border-color 0.2s",
        }}
      />

      <div style={{ marginBottom: 16, display: "flex", gap: 16, alignItems: "center" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <input 
            type="radio" 
            checked={paidBy === "me"} 
            onChange={() => setPaidBy("me")}
            style={{ width: 18, height: 18, cursor: "pointer" }}
          />
          <span style={{ fontSize: 15, color: "#374151", fontWeight: 500 }}>{payerLabel.me}</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <input 
            type="radio" 
            checked={paidBy === "her"} 
            onChange={() => setPaidBy("her")}
            style={{ width: 18, height: 18, cursor: "pointer" }}
          />
          <span style={{ fontSize: 15, color: "#374151", fontWeight: 500 }}>{payerLabel.her}</span>
        </label>
      </div>

      <button 
        onClick={handleAdd} 
        style={{ 
          width: "100%", 
          padding: 14, 
          borderRadius: 12,
          background: "#16a34a",
          color: "#ffffff",
          border: "2px solid #16a34a",
          fontSize: 16,
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(22, 163, 74, 0.3)",
          transition: "all 0.2s",
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(22, 163, 74, 0.4)";
          e.currentTarget.style.background = "#15803d";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(22, 163, 74, 0.3)";
          e.currentTarget.style.background = "#16a34a";
        }}
      >
        追加
      </button>
    </>
  );
}
