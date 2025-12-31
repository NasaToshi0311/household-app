import type React from "react";

export const page: React.CSSProperties = {
  padding: 16,
  maxWidth: 520,
  margin: "0 auto",
  fontFamily: "system-ui",
  background: "#f6f7fb",
  minHeight: "100vh",
};

export const h1: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 800,
  margin: "8px 0 12px",
};

export const card: React.CSSProperties = {
  border: "1px solid #e6e6e6",
  borderRadius: 16,
  padding: 14,
  background: "#fff",
  boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
};

export const label: React.CSSProperties = {
  fontSize: 12,
  color: "#666",
  marginBottom: 6,
};

export const input: React.CSSProperties = {
  width: "100%",
  padding: 12,
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "#fff",
  outline: "none",
};

export const row: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
};

export const btn: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #ddd",
  background: "#fafafa",
  cursor: "pointer",
};

export const btnPrimary: React.CSSProperties = {
  ...btn,
  border: "1px solid #2f6feb",
  background: "#2f6feb",
  color: "#fff",
  fontWeight: 700,
};

export const btnDanger: React.CSSProperties = {
  ...btn,
  border: "1px solid #ffb3b3",
  background: "#ffecec",
  color: "#a40000",
};

export const muted: React.CSSProperties = { fontSize: 12, color: "#777" };
