import type { PendingExpense } from "../db";
import * as S from "../ui/styles";
import { payerLabel } from "../constants/payer";

type Props = {
  items: PendingExpense[];
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

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {items.map((i) => (
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
                background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
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
