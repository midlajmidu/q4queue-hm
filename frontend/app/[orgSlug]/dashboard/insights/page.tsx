
"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import type { AnalyticsOverview } from "@/types/api";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { PageWrapper } from "@/components/PageWrapper";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

/* ─── Helpers ─────────────────────────────────────────────── */
function timeToSeconds(t: string): number {
  const p = t.split(":").map(Number);
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
  if (p.length === 2) return p[0] * 60 + p[1];
  return p[0] || 0;
}
function formatDuration(s: number): string {
  if (!s || s < 0) return "—";
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600),
    m = Math.floor((s % 3600) / 60), sec = Math.round(s % 60);
  if (d >= 1) return `${d}d ${h}h`;
  if (h >= 1) return `${h}h ${m}m`;
  if (m >= 1) return `${m}m ${sec}s`;
  return `${sec}s`;
}

/* ─── Colors ──────────────────────────────────────────────── */
const C = {
  bg: "var(--q-page-bg)", card: "var(--q-card-bg)",
  border: "var(--q-border)", borderLight: "var(--q-border-light)",
  text: "var(--q-text)", textSub: "var(--q-text-sub)", textMuted: "var(--q-text-muted)", textFaint: "var(--q-text-muted)",
  brand: "var(--q-brand)", brandLight: "var(--q-brand-light)", brandBorder: "var(--q-brand-border)",
  green: "var(--q-green)", greenBg: "var(--q-green-bg)", greenBd: "var(--q-green-border)",
  amber: "var(--q-amber)", amberBg: "var(--q-amber-bg)", amberBd: "var(--q-amber-border)",
  red: "var(--q-red)", redBg: "var(--q-red-bg)", redBd: "var(--q-red-border)",
  blue: "var(--q-blue)", blueBg: "var(--q-blue-bg)", blueBd: "var(--q-blue-border)",
  purple: "#7c3aed", purpleBg: "#f5f3ff", purpleBd: "#ddd6fe",
};

/* ─── Styles ──────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

.ins-root *, .ins-root *::before, .ins-root *::after { box-sizing: border-box; margin: 0; padding: 0; }
.ins-root {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: ${C.text};
  -webkit-font-smoothing: antialiased;
}

/* Layout */
.ins-stack { display: flex; flex-direction: column; gap: 24px; }

/* Card */
.ins-card {
  background: ${C.card};
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid ${C.border};
  border-radius: 8px;
  box-shadow: none;
  transition: all .25s ease;
}
.ins-card:hover {
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  border-color: #d1d5db;
}

/* Fade */
.ins-fade { animation: insFade .6s cubic-bezier(.16,1,.3,1) both; }
@keyframes insFade {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: none; }
}

/* Shimmer */
.ins-shim {
  border-radius: 8px;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: insShim 1.5s ease-in-out infinite;
}
@keyframes insShim { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

.date-input {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid ${C.border};
  font-size: 13px;
  background: var(--q-card-bg);
  color: var(--q-text);
  transition: border-color .15s;
}
.date-input:focus { outline: none; border-color: ${C.brand}; box-shadow: 0 0 0 3px rgba(79,70,229,.1); }
`;

const mono: React.CSSProperties = { fontVariantNumeric: "tabular-nums" };

export default function InsightsPage() {
  const { user } = useAuth();
  const orgSlug = user?.org_slug || "";
  const dashBase = `/${orgSlug}/dashboard`;

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  // Date Filters
  const getLocalDateStr = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  };

  const now = new Date();
  const today = getLocalDateStr(now);
  const lastWeek = getLocalDateStr(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
  const thirtyDays = getLocalDateStr(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));

  const [startDate, setStartDate] = useState(lastWeek);
  const [endDate, setEndDate] = useState(today);

  const load = useCallback(async () => {
    setLoading(true);
    try { setOverview(await api.getOverview({ startDate: startDate || undefined, endDate: endDate || undefined })); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const d = useMemo(() => {
    if (!overview) return null;
    const fmtH = (s: string) => { const h = parseInt(s.split(':')[0], 10); return isNaN(h) ? s : `${h % 12 || 12}${h >= 12 ? 'pm' : 'am'}`; };

    const hourly = (overview.charts?.hourly || []).map(h => ({ ...h, hour: fmtH(h.hour) }));
    const peak = hourly.length ? hourly.reduce((a, b) => b.visits > a.visits ? b : a, hourly[0]) : null;
    const totalV = hourly.reduce((s, h) => s + h.visits, 0);
    const avgV = hourly.length > 0 ? Math.round(totalV / hourly.length) : 0;
    const peakPct = totalV > 0 ? Math.round(((peak?.visits ?? 0) / totalV) * 100) : 0;

    const wA = timeToSeconds(overview.timings?.avg_waiting_time || "0");
    const sA = timeToSeconds(overview.timings?.avg_served_time || "0");

    const sc = overview.status_counts;

    // Pad the daily timings to ensure the chart always renders properly
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 86400000);
    const end = endDate ? new Date(endDate) : new Date();
    const dateMap = new Map();

    // Generate all dates in the range
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const iso = d.toISOString().split('T')[0];
      dateMap.set(iso, { date: iso, avg_wait: 0, avg_serve: 0 });
    }

    // Merge actual data
    (overview.daily_timings || []).forEach(dt => {
      // Some backends return full ISO strings, safely split it
      const dtDate = dt.date ? dt.date.split('T')[0] : "";
      if (dtDate) {
        dateMap.set(dtDate, dt);
      }
    });

    const paddedTimings = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    const dailyTimings = paddedTimings.map(dt => ({
      ...dt,
      dateFormatted: new Date(dt.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      avg_wait_min: dt.avg_wait / 60,
      avg_serve_min: dt.avg_serve / 60
    }));

    return {
      hourly, totalV, avgV, peakPct,
      peakHour: peak?.hour ?? "—", peakVisits: peak?.visits ?? 0,
      wA, sA,
      waiting: sc?.waiting ?? 0, served: sc?.served ?? 0, total: sc?.total ?? 0, cancelled: sc?.cancelled ?? 0,
      dailyTimings,
      staffPerformance: overview.staff_performance || []
    };
  }, [overview]);

  return (
    <>
      <style>{CSS}</style>
      <div className="ins-root">
        <PageWrapper
          title="Performance Insights"
          subtitle="Visualize queue trends, wait times, and staff efficiency."
          breadcrumbs={[
            { label: "Organization", href: dashBase },
            { label: "Analytics" }
          ]}
          action={
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex", background: C.borderLight, padding: 3, borderRadius: 8, gap: 2 }}>
                {[
                  { l: "Today", s: today, e: today },
                  { l: "7D", s: lastWeek, e: today },
                  { l: "30D", s: thirtyDays, e: today }
                ].map(b => {
                  const active = startDate === b.s && endDate === b.e;
                  return (
                    <button key={b.l} onClick={() => { setStartDate(b.s); setEndDate(b.e); }} style={{
                      padding: "5px 14px", fontSize: 12, fontWeight: 600, borderRadius: 6,
                      background: active ? "var(--q-card-bg)" : "transparent", color: active ? "var(--q-text)" : "var(--q-text-muted)",
                      border: active ? `1px solid var(--q-border)` : "1px solid transparent", boxShadow: active ? "0 1px 3px rgba(0,0,0,.08)" : "none",
                      cursor: "pointer", transition: "all .15s ease",
                    }}>{b.l}</button>
                  );
                })}
              </div>
              <div style={{ width: 1, height: 24, background: C.border }} />
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="date-input bg-white dark:bg-slate-900 text-gray-900 dark:text-white" style={{ colorScheme: "light dark" }} />
              <span style={{ color: C.textMuted, fontSize: 13, fontWeight: 500 }}>to</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="date-input bg-white dark:bg-slate-900 text-gray-900 dark:text-white" style={{ colorScheme: "light dark" }} />
              <button onClick={load} disabled={loading} style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px",
                fontSize: 13, fontWeight: 600, color: C.textSub,
                background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
                cursor: loading ? "not-allowed" : "pointer", opacity: loading ? .5 : 1,
                transition: "all .15s",
              }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 21v-5h5" />
                </svg>
                Refresh
              </button>
              <button onClick={async () => {
                try {
                  const blob = await api.exportAnalyticsCSV({ startDate, endDate });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `queue_report_${startDate}_to_${endDate}.csv`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                } catch (e) {
                  console.error("Export failed", e);
                  alert("Failed to export CSV report. Please try again.");
                }
              }} disabled={loading} style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px",
                fontSize: 13, fontWeight: 600, color: "#fff",
                background: C.brand, border: "none", borderRadius: 8,
                cursor: loading ? "not-allowed" : "pointer", opacity: loading ? .5 : 1,
                boxShadow: "0 1px 3px rgba(23, 19, 93, 0.07)", transition: "all .15s",
              }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export CSV
              </button>
            </div>
          }
        >
          {/* ═══ LOADING ═══ */}
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="ins-shim" style={{ height: 88 }} />)}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div className="ins-shim" style={{ height: 340 }} />
                <div className="ins-shim" style={{ height: 340 }} />
              </div>
              <div className="ins-shim" style={{ height: 200 }} />
            </div>
          ) : !d ? (
            <div className="ins-card" style={{ padding: "80px 32px", textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: C.borderLight, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={C.textFaint} strokeWidth={1.5}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 4 }}>No data available</p>
              <p style={{ fontSize: 13, color: C.textMuted }}>Try adjusting the date range.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

              {/* ═══ KPI CARDS ═══ */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
                {([
                  { label: "Total Tokens", val: d.total.toLocaleString() },
                  { label: "Served", val: d.served.toLocaleString() },
                  { label: "Avg Wait", val: formatDuration(d.wA) },
                  { label: "Avg Service", val: formatDuration(d.sA) },
                  { label: "Drop-off Rate", val: d.total > 0 ? `${Math.round((d.cancelled / d.total) * 100)}%` : "0%" },
                ]).map((s, i) => (
                  <div key={s.label} className="ins-card ins-fade" style={{ padding: "20px 24px", animationDelay: `${i * 50}ms` }}>
                    <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em", color: C.textMuted, marginBottom: 12 }}>{s.label}</p>
                    <p style={{ fontSize: 28, fontWeight: 700, color: C.text, letterSpacing: "-.02em", lineHeight: 1, ...mono }}>{s.val}</p>
                  </div>
                ))}
              </div>

              {/* ═══ CHARTS ROW ═══ */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 20 }}>

                {/* Hourly Traffic */}
                <div className="ins-card ins-fade" style={{ padding: "24px", animationDelay: "200ms" }}>
                  <div style={{ marginBottom: 20 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>Hourly Traffic Distribution</h2>
                    <p style={{ fontSize: 13, color: C.textMuted }}>Peak hour: <span style={{ fontWeight: 600, color: C.text }}>{d.peakHour}</span> ({d.peakPct}% of total)</p>
                  </div>
                  <div style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={d.hourly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.borderLight} />
                        <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: C.textMuted }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: C.textMuted }} />
                        <Tooltip
                          cursor={{ fill: "rgba(0,0,0,.03)" }}
                          contentStyle={{ borderRadius: 10, border: `1px solid ${C.border}`, boxShadow: "0 4px 1px rgba(0,0,0,.08)", fontSize: 13 }}
                        />
                        <Bar dataKey="visits" fill={C.brand} radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Daily Timing Trends */}
                <div className="ins-card ins-fade" style={{ padding: "24px", animationDelay: "300ms" }}>
                  <div style={{ marginBottom: 20 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>Average Timing Trends</h2>
                    <p style={{ fontSize: 13, color: C.textMuted }}>Wait vs Service times across days (in minutes).</p>
                  </div>
                  <div style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={d.dailyTimings} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={C.borderLight} />
                        <XAxis dataKey="dateFormatted" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: C.textMuted }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: C.textMuted }} />
                        <Tooltip
                          contentStyle={{ borderRadius: 10, border: `1px solid ${C.border}`, boxShadow: "0 4px 1px rgba(0,0,0,.08)", fontSize: 13 }}
                          formatter={(value: any) => [Math.round(Number(value) * 10) / 10 + " min"]}
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                        <Line type="monotone" name="Avg Service" dataKey="avg_serve_min" stroke={C.green} strokeWidth={2.5} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} />
                        <Line type="monotone" name="Avg Wait" dataKey="avg_wait_min" stroke={C.amber} strokeWidth={2.5} dot={{ r: 3, strokeWidth: 2 }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* ═══ STAFF PERFORMANCE TABLE ═══ */}
              <div className="ins-card ins-fade" style={{ animationDelay: "400ms", overflow: "hidden" }}>
                <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.borderLight}` }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>Staff Performance</h2>
                  <p style={{ fontSize: 13, color: C.textMuted }}>Tokens completed and average service time per team member.</p>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left", padding: "12px 24px", fontSize: 11, fontWeight: 600, color: C.textMuted, letterSpacing: ".04em", textTransform: "uppercase", background: "var(--q-slate-bg)", borderBottom: `1px solid ${C.borderLight}` }}>Staff Member</th>
                        <th style={{ textAlign: "right", padding: "12px 24px", fontSize: 11, fontWeight: 600, color: C.textMuted, letterSpacing: ".04em", textTransform: "uppercase", background: "var(--q-slate-bg)", borderBottom: `1px solid ${C.borderLight}` }}>Tokens Served</th>
                        <th style={{ textAlign: "right", padding: "12px 24px", fontSize: 11, fontWeight: 600, color: C.textMuted, letterSpacing: ".04em", textTransform: "uppercase", background: "var(--q-slate-bg)", borderBottom: `1px solid ${C.borderLight}` }}>Avg Service Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.staffPerformance.length === 0 ? (
                        <tr>
                          <td colSpan={3} style={{ padding: "40px", textAlign: "center", color: C.textMuted, fontSize: 14 }}>No staff performance data available.</td>
                        </tr>
                      ) : d.staffPerformance.map(s => (
                        <tr key={s.staff_id}
                          style={{ transition: "background .15s", borderBottom: `1px solid var(--q-border-light)` }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--q-card-bg-alt)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                        >
                          <td style={{ padding: "14px 24px", fontSize: 14, fontWeight: 600, color: C.text }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.brandLight, color: C.brand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                                {s.name.substring(0, 2).toUpperCase()}
                              </div>
                              {s.name}
                            </div>
                          </td>
                          <td className="tnum" style={{ textAlign: "right", padding: "14px 24px", fontSize: 14, fontWeight: 600, color: C.text, ...mono }}>{s.total_served}</td>
                          <td className="tnum" style={{ textAlign: "right", padding: "14px 24px", fontSize: 14, fontWeight: 600, color: C.green, ...mono }}>{formatDuration(s.avg_serve)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </PageWrapper>
      </div>
    </>
  );
}