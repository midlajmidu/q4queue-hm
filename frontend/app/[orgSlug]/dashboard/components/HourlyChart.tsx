import React from "react";

const C = {
  borderLight: "var(--q-border-light)",
  text: "var(--q-text)",
  textSub: "var(--q-text-sub)",
  textMuted: "var(--q-text-muted)",
  brand: "var(--q-brand)",
  violet: "#7c3aed",
  green: "var(--q-green)",
};

export function HourlyChart({ hourly, maxVisits, peakHour }: {
  hourly: { hour: string; visits: number }[];
  maxVisits: number;
  accentColor: string;
  peakHour: string;
}) {
  const totalV = hourly.reduce((s, h) => s + h.visits, 0);
  const avgV = hourly.length > 0 ? Math.round(totalV / hourly.length) : 0;
  const peakVisits = hourly.find(h => h.hour === peakHour)?.visits ?? 0;
  const peakPct = totalV > 0 ? Math.round((peakVisits / totalV) * 100) : 0;

  return (
    <div style={{ padding: "32px" }}>
      {/* KPI Row - Minimal */}
      <div style={{ display: "flex", gap: 48, marginBottom: 40, paddingBottom: 24, borderBottom: `1px solid ${C.borderLight}` }}>
        {[
          { label: "Total Daily", val: totalV.toLocaleString(), clr: C.brand },
          { label: "Peak Window", val: peakHour, clr: C.violet },
          { label: "Peak Load", val: `${peakPct}%`, clr: C.brand },
          { label: "Hourly Avg", val: avgV, clr: C.green },
        ].map(k => (
          <div key={k.label}>
            <p style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{k.label}</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{k.val}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 48 }}>
        {/* Main Chart Area */}
        <div>
          <div style={{ height: 180, display: "flex", alignItems: "flex-end", gap: 8 }}>
            {hourly.map((h, i) => {
              const isPk = h.hour === peakHour;
              const hPct = maxVisits > 0 ? (h.visits / maxVisits) * 100 : 0;
              return (
                <div key={i} className="hbar" style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "flex-end", position: "relative" }}>
                    <div style={{
                      width: "100%",
                      height: `${Math.max(hPct, 6)}%`,
                      background: isPk ? `linear-gradient(to top, ${C.violet}, #a855f7)` : `linear-gradient(to top, ${C.brand}, #818cf8)`,
                      opacity: isPk ? 1 : 0.8,
                      borderRadius: "6px 6px 2px 2px",
                      boxShadow: isPk ? "0 4px 12px rgba(139, 92, 246, 0.25)" : "none",
                      transition: "height 1s cubic-bezier(0.16, 1, 0.3, 1)"
                    }} />
                    {/* Value indicator on hover (optional enhancement) */}
                    <div className="ins-spark-val" style={{ position: "absolute", top: -25, left: "50%", transform: "translateX(-50%)", background: C.text, color: "#fff", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700, opacity: 0, transition: "opacity 0.2s" }}>{h.visits}</div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: isPk ? C.text : C.textMuted, textAlign: "center", whiteSpace: "nowrap" }}>{h.hour}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Minimal Side Analysis */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderLeft: `1px solid ${C.borderLight}`, paddingLeft: 32 }}>
          <div style={{ position: "relative", width: 110, height: 110, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="110" height="110" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" fill="none" stroke={C.borderLight} strokeWidth="6" />
              <circle cx="50" cy="50" r="44" fill="none" stroke={C.violet} strokeWidth="6" strokeDasharray="276" strokeDashoffset={276 - (276 * (peakPct / 100))} strokeLinecap="round" style={{ transformOrigin: "center", transform: "rotate(-90deg)", transition: "stroke-dashoffset 1.2s ease" }} />
            </svg>
            <div style={{ position: "absolute", textAlign: "center" }}>
              <p style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: "-.02em" }}>{peakPct}%</p>
            </div>
          </div>
          <div style={{ marginTop: 20, textAlign: "center" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.textSub }}>Peak Concentration</p>
            <p style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>Busy window at {peakHour}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
