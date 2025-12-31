import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import type { PendingExpense } from "../db";

type Props = {
  onAdd: (item: PendingExpense) => Promise<void> | void;
};

export default function ExpenseForm({ onAdd }: Props) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("食費");
  const [note, setNote] = useState("");
  const [paidBy, setPaidBy] = useState<"me" | "her">("me");

  async function handleAdd() {
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

    await onAdd(item);

    // 入力欄だけクリア（カテゴリ/支払者は残す方が入力が楽）
    setAmount("");
    setNote("");
  }

  return (
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

      <button onClick={handleAdd} style={{ width: "100%", padding: 12, borderRadius: 12 }}>
        追加
      </button>
    </>
  );
}
