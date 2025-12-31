import type { PendingExpense } from "../db";
import * as S from "../ui/styles";
import { payerLabel } from "../constants/payer";

type Props = {
  items: PendingExpense[];
  onDeleteOne: (clientUuid: string) => Promise<void> | void;
};

export default function PendingList({ items, onDeleteOne }: Props) {
  if (items.length === 0) {
    return <div style={S.muted}>未送信はありません</div>;
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {items.map((i) => (
        <div key={i.client_uuid} style={{ borderTop: "1px solid #eee", paddingTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <div>
              <div style={S.muted}>{i.date}</div>
              <div style={{ fontWeight: 800 }}>{i.category}</div>
              {i.note ? <div style={S.muted}>{i.note}</div> : null}
              <div style={S.muted}>{payerLabel[i.paid_by]}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>
                ¥{i.amount.toLocaleString("ja-JP")}
              </div>
              <button
                style={{ ...S.btnDanger, padding: "6px 10px", marginTop: 8 }}
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
