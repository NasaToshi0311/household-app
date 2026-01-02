import * as S from "../ui/styles";

type Props = {
  message: string;
  type: "success" | "error" | "info" | "warning";
  onClose: () => void;
};

export default function MessageBox({ message, type, onClose }: Props) {
  const styleMap = {
    success: S.successBox,
    error: S.errorBox,
    info: S.infoBox,
    warning: S.warningBox,
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1001,
        width: "90%",
        maxWidth: 400,
      }}
    >
      <div
        style={{
          ...styleMap[type],
          padding: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ flex: 1, whiteSpace: "pre-line" }}>{message}</div>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            fontSize: 20,
            cursor: "pointer",
            padding: 0,
            width: 24,
            height: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            lineHeight: 1,
            opacity: 0.7,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

