import * as S from "../ui/styles";

type Props = {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({ message, onConfirm, onCancel }: Props) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          padding: 24,
          maxWidth: 400,
          width: "100%",
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
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
            color: "#374151",
            lineHeight: 1.6,
            marginBottom: 24,
            whiteSpace: "pre-line",
          }}
        >
          {message}
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              ...S.btn,
              padding: "10px 20px",
              background: "#f3f4f6",
              color: "#374151",
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
            }}
          >
            削除
          </button>
        </div>
      </div>
    </div>
  );
}

