import type React from "react";

export const page: React.CSSProperties = {
  padding: 16,
  maxWidth: 520,
  margin: "0 auto",
  fontFamily: "system-ui",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  minHeight: "100vh",
};

export const h1: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 800,
  margin: "8px 0 16px",
  color: "#ffffff",
  textShadow: "0 2px 4px rgba(0,0,0,0.2)",
};

export const card: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.3)",
  borderRadius: 16,
  padding: 16,
  background: "#ffffff",
  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
};

export const label: React.CSSProperties = {
  fontSize: 13,
  color: "#555",
  marginBottom: 6,
  fontWeight: 600,
};

export const input: React.CSSProperties = {
  width: "100%",
  padding: 12,
  borderRadius: 12,
  border: "2px solid #e0e0e0",
  background: "#fff",
  outline: "none",
  fontSize: 15,
  transition: "border-color 0.2s",
};

export const row: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
};

export const btn: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 12,
  border: "2px solid #e0e0e0",
  background: "#f8f9fa",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
  transition: "all 0.2s",
  color: "#333",
};

export const btnPrimary: React.CSSProperties = {
  ...btn,
  border: "2px solid #4f46e5",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  color: "#fff",
  fontWeight: 700,
  boxShadow: "0 2px 8px rgba(102, 126, 234, 0.4)",
};

export const btnDanger: React.CSSProperties = {
  ...btn,
  border: "2px solid #ef4444",
  background: "#fee2e2",
  color: "#dc2626",
  fontWeight: 600,
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
  background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
  border: "2px solid #3b82f6",
  padding: 12,
  borderRadius: 12,
  color: "#1e40af",
  fontWeight: 500,
};
