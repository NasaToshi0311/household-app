import type { Expense } from "../db";
import * as S from "../ui/styles";
import { payerLabel } from "../constants/payer";

type Props = {
  items: Expense[];
  onDeleteOne: (clientUuid: string) => Promise<void> | void;
};

export default function PendingList({ items, onDeleteOne }: Props) {
  if (items.length === 0) {
    return (
      <div style={{ 
        ...S.muted, 
        textAlign: "center", 
        padding: "20px 0",
        fontSize: 14,
        color: "#9ca3af",
        fontStyle: "italic",
      }}>
        未送信はありません
      </div>
    );
  }

  // 日付の降順（最新が上）でソート、同じ日付の場合はclient_uuidで降順
  const sortedItems = [...items].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return b.client_uuid.localeCompare(a.client_uuid);
  });

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {sortedItems.map((i) => (
        <div 
          key={i.client_uuid} 
          style={{ 
            padding: 14,
            borderRadius: 12,
            background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
            border: "2px solid #f59e0b",
            boxShadow: "0 2px 6px rgba(245, 158, 11, 0.2)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ ...S.muted, marginBottom: 4, fontSize: 12 }}>{i.date}</div>
              <div style={{ fontWeight: 800, color: "#92400e", marginBottom: 4, fontSize: 16 }}>
                {i.category}
              </div>
              {i.note ? (
                <div style={{ ...S.muted, marginTop: 4, fontSize: 13, color: "#78350f" }}>
                  {i.note}
                </div>
              ) : null}
              <div style={{ ...S.muted, marginTop: 4, fontSize: 12, color: "#78350f" }}>
                {payerLabel[i.paid_by]}
              </div>
            </div>
            <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ 
                fontWeight: 900, 
                fontSize: 20,
                color: "#92400e",
              }}>
                ¥{i.amount.toLocaleString("ja-JP")}
              </div>
              <button
                style={{ 
                  ...S.btnDanger, 
                  padding: "8px 14px", 
                  fontSize: 13,
                  fontWeight: 600,
                }}
                onClick={() => onDeleteOne(i.client_uuid)}
              >
                削除
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
