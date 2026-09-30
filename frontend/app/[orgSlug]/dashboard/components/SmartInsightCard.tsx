import React from "react";
import type { IconProps } from "./DashboardIcons";

const C = {
  cardBg: "var(--q-card-bg)",
  border: "var(--q-border)",
  borderLight: "var(--q-border-light)",
  text: "var(--q-text)",
  textSub: "var(--q-text-sub)",
  textMuted: "var(--q-text-muted)",
};

export function SmartInsightCard({
  title, data, dataSub, analysis, recommendation, Icon, iconColor
}: {
  title: string; data: string; dataSub: string; analysis: string; recommendation: string;
  Icon: (p: IconProps) => React.ReactNode;
  iconColor: string;
}) {
  return (
    <div style={{
      background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 10,
      borderLeft: `3px solid ${iconColor}`,
      overflow: "hidden",
    }}>
      <div style={{ padding: "14px 16px 12px" }}>
        {/* Label */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <Icon size={13} color={iconColor} />
          <span style={{ fontSize: 10.5, fontWeight: 700, color: C.textMuted, letterSpacing: ".04em", textTransform: "uppercase" as const }}>{title}</span>
        </div>

        {/* Value */}
        <span className="mono tnum" style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: "-.03em", lineHeight: 1, display: "block" }}>{data}</span>
        <span style={{ fontSize: 10.5, fontWeight: 500, color: C.textMuted, marginTop: 3, display: "block" }}>{dataSub}</span>

        {/* Analysis */}
        <p style={{ margin: "10px 0 0", fontSize: 12, color: C.textSub, fontWeight: 400, lineHeight: 1.55 }}>
          {analysis}
        </p>
      </div>

      {/* Recommendation */}
      <div style={{ padding: "10px 16px", background: "#f9fafb", borderTop: `1px solid ${C.borderLight}` }}>
        <p style={{ margin: 0, fontSize: 11, color: C.textMuted, fontWeight: 450, lineHeight: 1.5 }}>
          💡 {recommendation}
        </p>
      </div>
    </div>
  );
}
