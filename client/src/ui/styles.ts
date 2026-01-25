import type React from "react";

export const page: React.CSSProperties = {
  padding: 16,
  maxWidth: 520,
  margin: "0 auto",
  fontFamily: "system-ui",
  background: "#f7f5f2",
  /* iOS Safariの100vh問題を回避 */
  minHeight: "100vh",
  minHeight: "-webkit-fill-available" as any,
  width: "100%",
  boxSizing: "border-box",
};

export const h1: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 800,
  margin: "8px 0 16px",
  color: "#1f2937",
};

export const card: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 16,
  background: "#ffffff",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
};

export const label: React.CSSProperties = {
  fontSize: 13,
  color: "#1f2937",
  marginBottom: 6,
  fontWeight: 600,
};

export const input: React.CSSProperties = {
  width: "100%",
  padding: 12,
  borderRadius: 12,
  border: "2px solid #e5e7eb",
  background: "#fff",
  outline: "none",
  fontSize: 16, /* iOS Safariで自動ズームを防ぐため16px以上 */
  color: "#1f2937",
  transition: "border-color 0.2s",
  WebkitAppearance: "none",
  appearance: "none",
  boxSizing: "border-box",
};

export const row: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
};

export const btn: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 12,
  border: "2px solid #e5e7eb",
  background: "#ffffff",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
  transition: "all 0.2s",
  color: "#1f2937",
  WebkitTapHighlightColor: "rgba(0, 0, 0, 0.1)",
  touchAction: "manipulation",
  WebkitUserSelect: "none",
  userSelect: "none",
};

export const btnPrimary: React.CSSProperties = {
  ...btn,
  border: "2px solid #16a34a",
  background: "#16a34a",
  color: "#ffffff",
  fontWeight: 700,
  boxShadow: "0 2px 8px rgba(22, 163, 74, 0.3)",
  WebkitTapHighlightColor: "rgba(255, 255, 255, 0.2)",
};

export const btnDanger: React.CSSProperties = {
  ...btn,
  border: "2px solid #ef4444",
  background: "#fee2e2",
  color: "#dc2626",
  fontWeight: 600,
  WebkitTapHighlightColor: "rgba(220, 38, 38, 0.1)",
};

export const btnSuccess: React.CSSProperties = {
  ...btn,
  border: "2px solid #10b981",
  background: "#d1fae5",
  color: "#059669",
  fontWeight: 600,
};

export const muted: React.CSSProperties = { 
  fontSize: 12, 
  color: "#6b7280" 
};

export const warningBox: React.CSSProperties = {
  background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
  border: "2px solid #f59e0b",
  padding: 12,
  borderRadius: 12,
  color: "#92400e",
  fontWeight: 500,
};

export const successBox: React.CSSProperties = {
  background: "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)",
  border: "2px solid #10b981",
  padding: 12,
  borderRadius: 12,
  color: "#065f46",
  fontWeight: 500,
};

export const infoBox: React.CSSProperties = {
  background: "#eff6ff",
  border: "2px solid #93c5fd",
  padding: 12,
  borderRadius: 12,
  color: "#1e40af",
  fontWeight: 500,
};
