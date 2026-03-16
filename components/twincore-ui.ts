import type { CSSProperties, ReactNode } from "react";

export const colors = {
  bg: "#0A0A0B",
  panel: "#111113",
  panelAlt: "#18181B",
  border: "#232326",
  borderAlt: "#27272A",
  text: "#FFFFFF",
  muted: "#A1A1AA",
  soft: "#D4D4D8",
  success: "#86EFAC",
};

export const shellStyle: CSSProperties = {
  minHeight: "100vh",
  background: colors.bg,
  color: colors.text,
  padding: "24px 16px 120px",
  maxWidth: 680,
  margin: "0 auto",
};

export const topBarStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 24,
  gap: 12,
};

export const brandStyle: CSSProperties = {
  fontSize: 12,
  color: colors.muted,
  marginBottom: 6,
};

export const pageTitleStyle: CSSProperties = {
  fontSize: 30,
  fontWeight: 800,
  margin: 0,
};

export const heroTitleStyle: CSSProperties = {
  fontSize: 34,
  fontWeight: 800,
  margin: 0,
};

export const pageSubtitleStyle: CSSProperties = {
  color: colors.muted,
  marginTop: 10,
  marginBottom: 0,
  lineHeight: 1.6,
};

export const cardStyle: CSSProperties = {
  background: colors.panel,
  border: `1px solid ${colors.border}`,
  borderRadius: 20,
  padding: 18,
  marginBottom: 18,
};

export const heroCardStyle: CSSProperties = {
  background: "linear-gradient(180deg, #151518 0%, #101012 100%)",
  border: `1px solid ${colors.border}`,
  borderRadius: 24,
  padding: 22,
  marginBottom: 18,
};

export const innerPanelStyle: CSSProperties = {
  background: colors.panelAlt,
  border: `1px solid ${colors.borderAlt}`,
  borderRadius: 14,
  padding: 14,
};

export const navButtonStyle: CSSProperties = {
  textDecoration: "none",
  color: colors.text,
  background: colors.panelAlt,
  border: `1px solid ${colors.borderAlt}`,
  borderRadius: 12,
  padding: "10px 14px",
  fontSize: 14,
  textAlign: "center",
};

export const primaryButtonStyle: CSSProperties = {
  background: "white",
  color: "black",
  border: "none",
  borderRadius: 14,
  padding: "14px 18px",
  fontWeight: 700,
  cursor: "pointer",
};

export const secondaryButtonStyle: CSSProperties = {
  background: colors.panelAlt,
  color: colors.text,
  border: `1px solid ${colors.borderAlt}`,
  borderRadius: 14,
  padding: "14px 16px",
  fontWeight: 700,
  cursor: "pointer",
};

export const inputStyle: CSSProperties = {
  width: "100%",
  background: colors.panelAlt,
  color: colors.text,
  border: `1px solid ${colors.borderAlt}`,
  borderRadius: 14,
  padding: "14px",
  fontSize: 14,
  boxSizing: "border-box",
};

export const sectionHeadingStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 12,
  fontSize: 22,
};

export const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 13,
  color: colors.muted,
  marginBottom: 6,
  marginTop: 12,
};

export const gridTwoStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
};

export const gridFourStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr 1fr",
  gap: 10,
  marginTop: 20,
};

export const navGridThreeStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: 10,
  marginTop: 20,
};

export function PageHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div style={topBarStyle}>
      <div>
        <p style={brandStyle}>TwinCore</p>
        <h1 style={pageTitleStyle}>{title}</h1>
      </div>
      {action}
    </div>
  );
}