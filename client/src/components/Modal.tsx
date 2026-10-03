import type React from "react";

type Props = {
  onClose: () => void;
  children: React.ReactNode;
};

/**
 * 画面全体を覆うモーダル（背景タップで閉じる）
 */
export default function Modal({ onClose, children }: Props) {
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
        alignItems: "flex-start",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
        paddingTop: "max(16px, env(safe-area-inset-top))",
        overflowY: "auto",
        /* iOS Safariの100vh問題を回避 */
        minHeight: "-webkit-fill-available" as any,
      } as React.CSSProperties}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          padding: 24,
          maxWidth: 440,
          width: "100%",
          marginTop: "max(20px, 5vh)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          boxSizing: "border-box",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
