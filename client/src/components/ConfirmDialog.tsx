import * as S from "../ui/styles";
import Modal from "./Modal";

type Props = {
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({ message, confirmLabel = "削除", onConfirm, onCancel }: Props) {
  return (
    <Modal onClose={onCancel}>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          marginBottom: 16,
          color: "#1f2937",
        }}
      >
        確認
      </div>
      <div
        style={{
          fontSize: 15,
          color: "#1f2937",
          lineHeight: 1.6,
          marginBottom: 24,
          whiteSpace: "pre-line",
        }}
      >
        {message}
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", flexWrap: "wrap" }}>
        <button
          onClick={onCancel}
          style={{
            ...S.btn,
            padding: "10px 20px",
            background: "#ffffff",
            color: "#1f2937",
            flex: "1 1 auto",
            minWidth: "100px",
          }}
        >
          キャンセル
        </button>
        <button
          onClick={onConfirm}
          style={{
            ...S.btnDanger,
            padding: "10px 20px",
            fontWeight: 700,
            flex: "1 1 auto",
            minWidth: "100px",
          }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
