import type { Expense } from "../db";
import * as S from "../ui/styles";
import { payerLabel } from "../constants/payer";
import { formatDateLabel } from "../utils/date";

type Props = {
  items: Expense[];
  onEdit: (item: Expense) => void;
  onDelete: (item: Expense) => void;
};

export default function PendingList({ items, onEdit, onDelete }: Props) {
  // 集計画面で削除した明細（op=delete）も未送信に含まれるが、ここでは入力分のみ表示
  const visible = items.filter((i) => i.op !== "delete");
  const deleteCount = items.length - visible.length;

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

  // 日付の降順（最新が上）でソート、同じ日付の場合は入力が新しい順
  const sortedItems = [...visible].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return b.updated_at.localeCompare(a.updated_at);
  });

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {deleteCount > 0 && (
        <div style={{ ...S.muted, fontSize: 13 }}>削除予定 {deleteCount}件（次回の同期でサーバーに反映されます）</div>
      )}
      {sortedItems.map((i) => (
        <div
          key={i.client_uuid}
          onClick={() => onEdit(i)}
          style={{
            padding: 14,
            borderRadius: 12,
            background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
            border: "2px solid #f59e0b",
            boxShadow: "0 2px 6px rgba(245, 158, 11, 0.2)",
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...S.muted, marginBottom: 4, fontSize: 12 }}>{formatDateLabel(i.date)}</div>
              <div style={{ fontWeight: 800, color: "#92400e", marginBottom: 4, fontSize: 16 }}>
                {i.category}
              </div>
              {i.note ? (
                <div style={{ ...S.muted, marginTop: 4, fontSize: 13, color: "#78350f", overflowWrap: "anywhere" }}>
                  {i.note}
                </div>
              ) : null}
              <div style={{ ...S.muted, marginTop: 4, fontSize: 12, color: "#78350f" }}>
                {payerLabel[i.paid_by]}・タップで編集
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
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(i);
                }}
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
