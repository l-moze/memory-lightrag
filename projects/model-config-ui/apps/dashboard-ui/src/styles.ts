export const page: React.CSSProperties = {
  fontFamily:
    "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, sans-serif",
  padding: 20,
  background: "#f6f7fb",
  minHeight: "100vh",
};

export const container: React.CSSProperties = { maxWidth: 1200, margin: "0 auto" };

export const h1: React.CSSProperties = { margin: 0, marginBottom: 8, fontSize: 22, letterSpacing: -0.2 };

export const muted: React.CSSProperties = { color: "#6b7280" };

export const card: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 14,
  background: "#fff",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};

export const button: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  cursor: "pointer",
};

export const primaryButton: React.CSSProperties = {
  ...button,
  background: "#111827",
  color: "#fff",
  borderColor: "#111827",
};

export const input: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  outline: "none",
};

export const tinyButton: React.CSSProperties = {
  ...button,
  padding: "6px 10px",
  borderRadius: 10,
  fontSize: 12,
};

export const badge: React.CSSProperties = {
  fontSize: 11,
  padding: "2px 8px",
  borderRadius: 999,
  border: "1px solid #e5e7eb",
  background: "#f9fafb",
  color: "#374151",
};
