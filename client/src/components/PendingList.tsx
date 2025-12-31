import type { PendingExpense } from "../db";

type Props = {
  items: PendingExpense[];
  onDeleteOne: (clientUuid: string) => Promise<void> | void;
};

export default function PendingList({ items, onDeleteOne }: Props) {
  if (items.length === 0) {
    return <div style={{ color: "#666", fontSize: 13 }}>未送信はありません</div>;
  }

  return (
    <ul style={{ paddingLeft: 16 }}>
      {items.map((i) => (
        <li key={i.client_uuid} style={{ marginBottom: 10 }}>
          {i.date} / {i.category} / {i.amount}円 / {i.paid_by}{" "}
          <button onClick={() => onDeleteOne(i.client_uuid)}>削除</button>
        </li>
      ))}
    </ul>
  );
}
