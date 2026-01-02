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

    const amountNum = Number(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("金額は0より大きい数値を入力してください");
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

    const item: PendingExpense = {
      client_uuid: uuidv4(),
      date: new Date().toISOString().slice(0, 10),
      amount: amountNum,
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
        placeholder="金額"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={{ 
          width: "100%", 
          marginBottom: 12, 
          padding: 14, 
          borderRadius: 12, 
          border: "2px solid #e0e0e0",
          fontSize: 16,
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
          border: "2px solid #e0e0e0",
          fontSize: 15,
          background: "#fff",
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
          border: "2px solid #e0e0e0",
          fontSize: 15,
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
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "#fff",
          border: "none",
          fontSize: 16,
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(102, 126, 234, 0.4)",
          transition: "all 0.2s",
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.5)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 2px 8px rgba(102, 126, 234, 0.4)";
        }}
      >
        追加
      </button>
    </>
  );
}
