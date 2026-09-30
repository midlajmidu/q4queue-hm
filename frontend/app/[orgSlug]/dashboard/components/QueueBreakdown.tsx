import React from "react";
import type { AnalyticsOverview } from "@/types/api";
import { Icons } from "./DashboardIcons";

type QueueSummaryItem = NonNullable<AnalyticsOverview["queue_summary"]>[number];

const C = {
  brandLight: "var(--q-brand-light)",
  brandBorder: "var(--q-brand-border)",
  brand: "var(--q-brand)",
  text: "var(--q-text)",
  textMuted: "var(--q-text-muted)",
  borderLight: "var(--q-border-light)",
  green: "var(--q-green)",
};

export interface QueueBreakdownProps {
  queueStats: QueueSummaryItem[];
  canViewStaffPresence?: boolean;
}

export function QueueBreakdown({ queueStats, canViewStaffPresence }: QueueBreakdownProps) {
  if (!queueStats || queueStats.length === 0) return null;

  const totalServed = queueStats.reduce((s, q) => s + q.served, 0);
  const totalWaiting = queueStats.reduce((s, q) => s + q.waiting, 0);
  const grandTotal = queueStats.reduce((s, q) => s + q.total, 0);
  const overallPct = grandTotal > 0 ? Math.round((totalServed / grandTotal) * 100) : 0;

  return (
    <div style={{ marginTop: canViewStaffPresence ? 16 : 0 }}>
      <div className="section-label" style={{ marginBottom: 14 }}>Queue Summary</div>
      <div className="card" style={{ overflow: "hidden" }}>
        <div className="card-header" style={{ flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div className="icon-badge" style={{ width: 32, height: 32, background: C.brandLight, border: `1px solid ${C.brandBorder}` }}>
              <Icons.Table2 size={14} color={C.brand} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.text, letterSpacing: "-.01em", whiteSpace: "nowrap" }}>Queue Summary</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.brand, background: C.brandLight, padding: "2px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>
              {queueStats.length} queue{queueStats.length !== 1 ? "s" : ""}
            </span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 500, color: C.textMuted, whiteSpace: "nowrap" }}>{grandTotal} total tokens</span>
        </div>
        <div className="overflow-x-auto scrollbar-hide w-full" style={{ overflowX: "auto" }}>
          <table className="hidden md:table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Queue Name", "Served", "Waiting", "Progress", "Total"].map((h, i) => (
                  <th key={h} style={{
                    padding: "8px 20px",
                    fontSize: 10, fontWeight: 600, color: C.textMuted,
                    letterSpacing: ".06em", textTransform: "uppercase" as const,
                    textAlign: i === 0 ? "left" as const : i === 4 ? "right" as const : "center" as const,
                    borderBottom: `1px solid var(--q-border-light)`,
                    background: "var(--q-slate-bg)",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {queueStats.map(qs => {
                const pct = qs.total > 0 ? Math.round((qs.served / qs.total) * 100) : 0;
                return (
                  <tr key={qs.queue} style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                    <td style={{ padding: "12px 20px" }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{qs.queue}</span>
                    </td>
                    <td style={{ textAlign: "center", padding: "12px 20px" }}>
                      <span className="mono tnum" style={{ fontSize: 13, fontWeight: 700, color: "#15803d" }}>{qs.served}</span>
                    </td>
                    <td style={{ textAlign: "center", padding: "12px 20px" }}>
                      <span className="mono tnum" style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>{qs.waiting}</span>
                    </td>
                    <td style={{ padding: "12px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, height: 5, borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, borderRadius: 99, background: C.green, transition: "width .4s ease" }} />
                        </div>
                        <span className="mono tnum" style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, minWidth: 28, textAlign: "right" }}>{pct}%</span>
                      </div>
                    </td>
                    <td className="tnum" style={{ textAlign: "right", padding: "12px 20px" }}>
                      <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{qs.total}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ padding: "10px 20px", borderTop: `1px solid var(--q-border-light)`, background: "var(--q-slate-bg)" }}>
                  <span style={{ fontWeight: 700, fontSize: 10, color: C.textMuted, letterSpacing: ".05em", textTransform: "uppercase" as const }}>Total</span>
                </td>
                <td style={{ textAlign: "center", padding: "10px 20px", borderTop: `1px solid var(--q-border-light)`, background: "var(--q-slate-bg)" }}>
                  <span className="mono tnum" style={{ fontSize: 13, fontWeight: 700, color: "#15803d" }}>{totalServed}</span>
                </td>
                <td style={{ textAlign: "center", padding: "10px 20px", borderTop: `1px solid var(--q-border-light)`, background: "var(--q-slate-bg)" }}>
                  <span className="mono tnum" style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>{totalWaiting}</span>
                </td>
                <td style={{ padding: "10px 20px", borderTop: `1px solid var(--q-border-light)`, background: "var(--q-slate-bg)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, height: 5, borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${overallPct}%`, borderRadius: 99, background: C.brand }} />
                    </div>
                    <span className="mono tnum" style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, minWidth: 28, textAlign: "right" }}>{overallPct}%</span>
                  </div>
                </td>
                <td className="tnum" style={{ textAlign: "right", padding: "10px 20px", borderTop: `1px solid var(--q-border-light)`, background: "var(--q-slate-bg)" }}>
                  <span className="mono" style={{ fontSize: 14, fontWeight: 800, color: C.brand }}>{grandTotal}</span>
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Mobile Stacked View */}
          <div className="md:hidden flex flex-col w-full divide-y divide-black/5">
            {queueStats.map(qs => {
              const pct = qs.total > 0 ? Math.round((qs.served / qs.total) * 100) : 0;
              return (
                <div key={qs.queue} className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{qs.queue}</span>
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-md border border-black/5">
                      <span style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase" }}>Total</span>
                      <span className="mono tnum" style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{qs.total}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-0.5">
                      <span style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase" }}>Served</span>
                      <span className="mono tnum" style={{ fontSize: 14, fontWeight: 700, color: "#15803d" }}>{qs.served}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase" }}>Waiting</span>
                      <span className="mono tnum" style={{ fontSize: 14, fontWeight: 700, color: "#92400e" }}>{qs.waiting}</span>
                    </div>
                    
                    <div className="flex-1 flex flex-col items-end gap-1">
                      <span style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase" }}>Progress</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", maxWidth: 100, justifyContent: "flex-end" }}>
                        <div style={{ flex: 1, height: 5, borderRadius: 99, background: "#f1f5f9", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${pct}%`, borderRadius: 99, background: C.green, transition: "width .4s ease" }} />
                        </div>
                        <span className="mono tnum" style={{ fontSize: 11, fontWeight: 600, color: C.textMuted }}>{pct}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Mobile Overall Total Footer */}
            <div className="p-4" style={{ background: "var(--q-slate-bg)" }}>
              <div className="flex justify-between items-center mb-3">
                <span style={{ fontWeight: 700, fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".05em" }}>Overall Total</span>
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-0.5 rounded-md border border-black/5 dark:border-white/10 shadow-sm">
                  <span style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase" }}>Total</span>
                  <span className="mono tnum" style={{ fontSize: 14, fontWeight: 800, color: C.brand }}>{grandTotal}</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="flex flex-col gap-0.5">
                  <span style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase" }}>Served</span>
                  <span className="mono tnum" style={{ fontSize: 14, fontWeight: 700, color: "#15803d" }}>{totalServed}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase" }}>Waiting</span>
                  <span className="mono tnum" style={{ fontSize: 14, fontWeight: 700, color: "#92400e" }}>{totalWaiting}</span>
                </div>
                <div className="flex-1 flex flex-col items-end gap-1">
                  <span style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textTransform: "uppercase" }}>Overall Progress</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", maxWidth: 100, justifyContent: "flex-end" }}>
                    <div className="bg-slate-200 dark:bg-slate-700" style={{ flex: 1, height: 5, borderRadius: 99, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${overallPct}%`, borderRadius: 99, background: C.brand }} />
                    </div>
                    <span className="mono tnum" style={{ fontSize: 11, fontWeight: 600, color: C.textMuted }}>{overallPct}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
