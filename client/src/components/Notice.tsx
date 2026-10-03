export type NoticeData = {
  id: number;
  type: "success" | "error";
  text: string;
};

type Props = {
  notice: NoticeData;
  onClose: () => void;
};

const COLORS = {
  success: { background: "#065f46", color: "#ffffff" },
  error: { background: "#fee2e2", color: "#991b1b", border: "2px solid #ef4444" },
};

/**
 * 画面下部に表示する通知（alertの代わり）
 * 成功は自動で消え、エラーは×で閉じるまで残る（呼び出し側で制御）
 */
export default function Notice({ notice, onClose }: Props) {
  return (
    <div
      role={notice.type === "error" ? "alert" : "status"}
      style={{
        position: "fixed",
        left: 16,
        right: 16,
        bottom: "max(16px, env(safe-area-inset-bottom))",
        maxWidth: 488,
        margin: "0 auto",
        zIndex: 1100,
        padding: "12px 14px",
        borderRadius: 12,
        boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        fontSize: 14,
        lineHeight: 1.6,
        ...COLORS[notice.type],
      }}
    >
      <div style={{ flex: 1, whiteSpace: "pre-line" }}>{notice.text}</div>
      <button
        onClick={onClose}
        aria-label="閉じる"
        style={{
          border: "none",
          background: "transparent",
          color: "inherit",
          fontSize: 18,
          lineHeight: 1,
          padding: 4,
          cursor: "pointer",
        }}
      >
        ×
      </button>
    </div>
  );
}
