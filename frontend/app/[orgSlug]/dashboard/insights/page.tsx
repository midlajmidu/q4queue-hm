"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import type { AnalyticsOverview } from "@/types/api";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

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
  bg: "#f8fafc", card: "#ffffff",
  border: "#e2e8f0", borderLight: "#f1f5f9",
  text: "#0f172a", textSub: "#334155", textMuted: "#64748b", textFaint: "#94a3b8",
  brand: "#4f46e5", brandLight: "#eef2ff", brandBorder: "#c7d2fe",
  green: "#059669", greenBg: "#ecfdf5", greenBd: "#a7f3d0",
  amber: "#d97706", amberBg: "#fffbeb", amberBd: "#fde68a",
  red: "#dc2626", redBg: "#fef2f2", redBd: "#fecaca",
  blue: "#2563eb", blueBg: "#eff6ff", blueBd: "#bfdbfe",
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
.ins-grid-main { display: grid; grid-template-columns: 320px 1fr; gap: 20px; }

/* Card */
.ins-card {
  background: ${C.card};
  border: 1px solid ${C.border};
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,.02), 0 4px 12px rgba(0,0,0,.03);
  transition: transform .2s ease, box-shadow .2s ease;
}
.ins-card:hover {
  box-shadow: 0 4px 6px rgba(0,0,0,.02), 0 10px 20px rgba(0,0,0,.04);
}

/* Tag */
.ins-tag {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 6px;
  background: ${C.borderLight};
  color: ${C.textMuted};
  text-transform: uppercase;
  letter-spacing: .04em;
}

/* Glow */
.ins-radial-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 140%;
  height: 140%;
  background: radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

/* Sparkline */
.ins-spark-col { position: relative; height: 100%; }
.ins-spark-bar { cursor: pointer; position: relative; z-index: 2; }
.ins-spark-bar:hover { background: ${C.brand} !important; transform: scaleX(1.1); }
.ins-spark-val {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translate(-50%, -8px);
  background: ${C.text};
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  opacity: 0;
  pointer-events: none;
  transition: all .2s ease;
  z-index: 10;
}
.ins-spark-col:hover .ins-spark-val { opacity: 1; transform: translate(-50%, -12px); }

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

/* Progress */
.ins-prog { height: 8px; background: ${C.borderLight}; border-radius: 99px; overflow: hidden; }
.ins-prog-fill { height: 100%; border-radius: 99px; transition: width .8s cubic-bezier(.4,0,.2,1); }

/* Bar fill */
.ins-bar-fill { height: 100%; border-radius: 99px; transition: width .8s cubic-bezier(.4,0,.2,1); }

/* KPI Premium */
.ins-kpi-card-premium {
  transition: all .2s ease;
}
.ins-kpi-card-premium:hover {
  transform: translateY(-2px);
}

/* Responsive */
@media (max-width: 1100px) {
  .ins-grid-main { grid-template-columns: 1fr !important; }
}
@media (max-width: 1024px) {
  .ins-kpi { grid-template-columns: repeat(3, 1fr) !important; }
  .ins-cards3 { grid-template-columns: 1fr 1fr !important; }
  .ins-timing { flex-direction: column !important; }
  .ins-timing-div { width: 100% !important; height: 1px !important; }
}
@media (max-width: 640px) {
  .ins-kpi { grid-template-columns: repeat(2, 1fr) !important; }
  .ins-cards3 { grid-template-columns: 1fr !important; }
  .ins-hdr-row { flex-direction: column !important; align-items: flex-start !important; }
}
`;

/* ─── Mono helper ─────────────────────────────────────────── */
const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace", fontVariantNumeric: "tabular-nums" };

/* ─── Main ────────────────────────────────────────────────── */
export default function InsightsPage() {
  const { user } = useAuth();
  const orgSlug = user?.org_slug || "";
  const dashBase = `/${orgSlug}/dashboard`;

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setOverview(await api.getOverview()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const d = useMemo(() => {
    if (!overview) return null;
    const fmtH = (s: string) => { const h = parseInt(s.split(':')[0], 10); return isNaN(h) ? s : `${h % 12 || 12}${h >= 12 ? 'pm' : 'am'}`; };
    const hourly = (overview.charts?.hourly || []).map(h => ({ ...h, hour: fmtH(h.hour) }));
    const peak = hourly.length ? hourly.reduce((a, b) => b.visits > a.visits ? b : a, hourly[0]) : null;
    const maxV = hourly.length ? Math.max(...hourly.map(h => h.visits)) : 0;
    const totalV = hourly.reduce((s, h) => s + h.visits, 0);
    const avgV = hourly.length > 0 ? Math.round(totalV / hourly.length) : 0;
    const peakPct = totalV > 0 ? Math.round(((peak?.visits ?? 0) / totalV) * 100) : 0;
    const wA = timeToSeconds(overview.timings?.avg_waiting_time || "0");
    const wM = timeToSeconds(overview.timings?.max_waiting_time || "0");
    const sA = timeToSeconds(overview.timings?.avg_served_time || "0");
    const sM = timeToSeconds(overview.timings?.max_served_time || "0");
    const wRatio = wA > 0 ? Math.round((wM / wA) * 10) / 10 : 0;
    const sEff = sA > 0 ? Math.round((300 / sA) * 100) : 0;
    const wP = wM ? Math.round((wA / wM) * 100) : 0;
    const sP = sM ? Math.round((sA / sM) * 100) : 0;
    const sc = overview.status_counts;
    return {
      hourly, maxV, totalV, avgV, peakPct,
      peakHour: peak?.hour ?? "—", peakVisits: peak?.visits ?? 0,
      wA, wM, sA, sM, wP, sP, wRatio, sEff,
      waiting: sc?.waiting ?? 0, served: sc?.served ?? 0, total: sc?.total ?? 0, cancelled: sc?.cancelled ?? 0,
    };
  }, [overview]);

  const cRate = d ? (d.total > 0 ? Math.round((d.served / d.total) * 100) : 0) : 0;
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  /* ─── Render ─── */
  return (
    <>
      <style>{CSS}</style>
      <div className="ins-root">
        <div className="ins-stack">

          {/* ═══ HEADER ═══ */}
          <div className="ins-fade">
            {/* Breadcrumb */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
              <Link href={dashBase} style={{ fontSize: 13, fontWeight: 500, color: C.textMuted, textDecoration: "none" }}>Dashboard</Link>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={C.textFaint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Insights</span>
            </div>
            <div className="ins-hdr-row" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, letterSpacing: "-.02em", lineHeight: 1.2, margin: 0 }}>Performance Insights</h1>
                <p style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>{today}</p>
              </div>
              <button onClick={load} disabled={loading} style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px",
                fontSize: 13, fontWeight: 600, fontFamily: "inherit", color: C.textSub,
                background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
                cursor: loading ? "not-allowed" : "pointer", opacity: loading ? .6 : 1,
                boxShadow: "0 1px 2px rgba(0,0,0,.04)", transition: "all .15s",
              }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 21v-5h5" />
                </svg>
                Refresh
              </button>
            </div>
          </div>

          {/* ═══ LOADING ═══ */}
          {loading ? (
            <div className="ins-stack" style={{ gap: 16 }}>
              <div className="ins-kpi" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className="ins-shim" style={{ height: 88 }} />)}
              </div>
              <div className="ins-shim" style={{ height: 220 }} />
              <div className="ins-shim" style={{ height: 200 }} />
            </div>

          ) : !d ? (
            /* ═══ EMPTY ═══ */
            <div className="ins-card" style={{ padding: "80px 32px", textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: C.borderLight, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={C.textFaint} strokeWidth={1.5}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 4 }}>No data available</p>
              <p style={{ fontSize: 13, color: C.textMuted }}>Start a session to see performance insights.</p>
            </div>

          ) : (
            <>
              {/* ═══ KPI GRID ═══ */}
              <div className="ins-kpi" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
                {([
                  { label: "Total Tokens", val: d.total.toLocaleString(), clr: C.brand, bg: C.brandLight },
                  { label: "Served", val: d.served.toLocaleString(), clr: C.green, bg: C.greenBg },
                  { label: "Waiting", val: String(d.waiting), clr: C.amber, bg: C.amberBg },
                  { label: "Cancelled", val: String(d.cancelled), clr: C.red, bg: C.redBg },
                  { label: "Completion", val: `${cRate}%`, clr: cRate >= 90 ? C.green : cRate >= 70 ? C.amber : C.red, bg: cRate >= 90 ? C.greenBg : cRate >= 70 ? C.amberBg : C.redBg },
                  { label: "Total Visits", val: d.totalV.toLocaleString(), clr: C.blue, bg: C.blueBg },
                ]).map((s, i) => (
                  <div key={s.label} className="ins-card ins-fade" style={{ padding: "20px", animationDelay: `${i * 50}ms` }}>
                    <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", color: C.textMuted, marginBottom: 10 }}>{s.label}</p>
                    <p style={{ fontSize: 26, fontWeight: 700, color: C.text, letterSpacing: "-.02em", lineHeight: 1, ...mono }}>{s.val}</p>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.clr }} />
                      <span style={{ fontSize: 11, fontWeight: 500, color: C.textMuted }}>Live</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* ═══ TIMING ═══ */}
              <div className="ins-card ins-fade" style={{ overflow: "hidden", animationDelay: "300ms" }}>
                <div style={{ padding: "16px 24px", borderBottom: `1px solid ${C.borderLight}` }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Timing Analysis</p>
                </div>
                <div className="ins-timing" style={{ display: "flex" }}>
                  {/* Wait */}
                  <div style={{ flex: 1, padding: "24px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.textSub }}>Wait Times</span>
                      {d.wRatio > 2 && <span style={{ fontSize: 11, fontWeight: 600, color: C.amber, background: C.amberBg, border: `1px solid ${C.amberBd}`, padding: "2px 8px", borderRadius: 99 }}>High Variance</span>}
                    </div>
                    <div style={{ display: "flex", gap: 32, marginBottom: 20 }}>
                      {[{ l: "AVERAGE", v: formatDuration(d.wA), c: C.brand }, { l: "MAXIMUM", v: formatDuration(d.wM), c: C.text }].map(v => (
                        <div key={v.l}>
                          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".06em", color: C.textMuted, marginBottom: 6 }}>{v.l}</p>
                          <p style={{ fontSize: 28, fontWeight: 700, color: v.c, lineHeight: 1, letterSpacing: "-.02em", ...mono }}>{v.v}</p>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 12, color: C.textMuted }}>Avg / Max ratio</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.text, ...mono }}>{d.wP}%</span>
                      </div>
                      <div className="ins-prog">
                        <div className="ins-prog-fill" style={{ width: `${Math.min(d.wP, 100)}%`, background: d.wRatio > 2 ? C.amber : C.brand }} />
                      </div>
                    </div>
                    <div style={{ background: C.borderLight, padding: "12px 14px", borderRadius: 8 }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: C.textSub, lineHeight: 1.5 }}>
                        {d.wRatio > 2 ? `Max wait is ${d.wRatio}× average — high variance.` : "Wait times are stable."}
                      </p>
                    </div>
                  </div>

                  <div className="ins-timing-div" style={{ width: 1, background: C.borderLight }} />

                  {/* Service */}
                  <div style={{ flex: 1, padding: "24px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.textSub }}>Service Times</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: d.sEff >= 100 ? C.green : C.amber, background: d.sEff >= 100 ? C.greenBg : C.amberBg, border: `1px solid ${d.sEff >= 100 ? C.greenBd : C.amberBd}`, padding: "2px 8px", borderRadius: 99 }}>{d.sEff}% eff.</span>
                    </div>
                    <div style={{ display: "flex", gap: 32, marginBottom: 20 }}>
                      {[{ l: "AVERAGE", v: formatDuration(d.sA), c: C.green }, { l: "MAXIMUM", v: formatDuration(d.sM), c: C.text }].map(v => (
                        <div key={v.l}>
                          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".06em", color: C.textMuted, marginBottom: 6 }}>{v.l}</p>
                          <p style={{ fontSize: 28, fontWeight: 700, color: v.c, lineHeight: 1, letterSpacing: "-.02em", ...mono }}>{v.v}</p>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 12, color: C.textMuted }}>Avg / Max ratio</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.text, ...mono }}>{d.sP}%</span>
                      </div>
                      <div className="ins-prog">
                        <div className="ins-prog-fill" style={{ width: `${Math.min(d.sP, 100)}%`, background: C.green }} />
                      </div>
                    </div>
                    <div style={{ background: C.borderLight, padding: "12px 14px", borderRadius: 8 }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: C.textSub, lineHeight: 1.5 }}>
                        {d.sEff < 100 ? `${100 - d.sEff}% below 5-min benchmark.` : "Operating at peak efficiency."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ═══ INSIGHT CARDS ═══ */}
              <div className="ins-cards3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                {([
                  {
                    label: "Peak Hour", value: d.peakHour,
                    sub: `${d.peakVisits} visits · ${d.peakPct}% of traffic`,
                    tip: "Consider adding staff during this peak window.",
                    clr: C.amber, bg: C.amberBg,
                    icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={C.amber} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
                  },
                  {
                    label: "Queue Balance", value: String(d.waiting),
                    sub: "currently waiting",
                    tip: d.waiting > 10 ? "Redirect arrivals to less busy lines." : "Queue distribution is manageable.",
                    clr: C.brand, bg: C.brandLight,
                    icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={C.brand} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
                  },
                  {
                    label: "Completion Rate", value: `${cRate}%`,
                    sub: `${d.served} of ${d.total} served`,
                    tip: cRate >= 90 ? "Excellent completion rate." : "Some tokens are not being completed.",
                    clr: cRate >= 90 ? C.green : C.amber, bg: cRate >= 90 ? C.greenBg : C.amberBg,
                    icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={cRate >= 90 ? C.green : C.amber} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
                  },
                ]).map((c, i) => (
                  <div key={c.label} className="ins-card ins-fade" style={{ display: "flex", flexDirection: "column", animationDelay: `${400 + i * 60}ms` }}>
                    <div style={{ padding: "20px 20px 16px", flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>{c.icon}</div>
                        <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", color: c.clr }}>{c.label}</span>
                      </div>
                      <p style={{ fontSize: 32, fontWeight: 700, color: C.text, letterSpacing: "-.02em", lineHeight: 1, marginBottom: 6, ...mono }}>{c.value}</p>
                      <p style={{ fontSize: 12, color: C.textMuted }}>{c.sub}</p>
                    </div>
                    <div style={{ padding: "12px 20px", borderTop: `1px solid ${C.borderLight}`, background: C.borderLight }}>
                      <p style={{ fontSize: 12, color: C.textSub, lineHeight: 1.5 }}>💡 {c.tip}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* ═══ TRAFFIC INTELLIGENCE (CLEAN REDESIGN) ═══ */}
              <div className="ins-card ins-fade" style={{ padding: "32px", animationDelay: "600ms" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 40 }}>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, letterSpacing: "-.02em" }}>Hourly Traffic Analysis</h2>
                    <p style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>Comprehensive distribution of visitor traffic across operational hours.</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 24, fontWeight: 800, color: C.text, ...mono }}>{d.totalV.toLocaleString()}</p>
                    <p style={{ fontSize: 11, fontWeight: 600, color: C.textFaint, textTransform: "uppercase", letterSpacing: ".05em" }}>Total Daily Visits</p>
                  </div>
                </div>

                {/* KPI Row - Minimal */}
                <div style={{ display: "flex", gap: 48, marginBottom: 48, paddingBottom: 32, borderBottom: `1px solid ${C.borderLight}` }}>
                  {[
                    { label: "Peak Window", val: d.peakHour, sub: `${d.peakVisits} visits`, clr: C.brand },
                    { label: "Peak Load", val: `${d.peakPct}%`, sub: "of total traffic", clr: C.purple },
                    { label: "Hourly Avg", val: d.avgV, sub: "visits / hr", clr: C.green },
                  ].map(k => (
                    <div key={k.label}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>{k.label}</p>
                      <p style={{ fontSize: 20, fontWeight: 700, color: C.text }}>{k.val}</p>
                      <p style={{ fontSize: 12, color: C.textFaint, marginTop: 2 }}>{k.sub}</p>
                    </div>
                  ))}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 64 }}>
                  {/* Primary Chart Area */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.textSub }}>Visitor Volume Timeline</span>
                      <div style={{ display: "flex", gap: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.brand }} />
                          <span style={{ fontSize: 11, color: C.textMuted }}>Normal</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.purple }} />
                          <span style={{ fontSize: 11, color: C.textMuted }}>Peak</span>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ height: 200, display: "flex", alignItems: "flex-end", gap: 6 }}>
                      {d.hourly.map((h, i) => {
                        const isPk = h.hour === d.peakHour;
                        const hPct = d.maxV > 0 ? (h.visits / d.maxV) * 100 : 0;
                        return (
                          <div key={i} className="ins-spark-col" style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
                            <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "flex-end" }}>
                              <div className="ins-spark-bar" style={{ 
                                width: "100%", 
                                height: `${Math.max(hPct, 4)}%`, 
                                background: isPk ? `linear-gradient(to top, ${C.purple}, #a855f7)` : `linear-gradient(to top, ${C.brand}, #818cf8)`,
                                opacity: isPk ? 1 : 0.8,
                                borderRadius: "6px 6px 2px 2px",
                                boxShadow: isPk ? "0 4px 12px rgba(139, 92, 246, 0.2)" : "none"
                              }} />
                              <div className="ins-spark-val">{h.visits}</div>
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 600, color: isPk ? C.text : C.textFaint, textAlign: "center" }}>{h.hour}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Minimal Donut / Distribution */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderLeft: `1px solid ${C.borderLight}`, paddingLeft: 40 }}>
                    <div style={{ position: "relative", width: 140, height: 140, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="140" height="140" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="44" fill="none" stroke={C.borderLight} strokeWidth="6" />
                        <circle cx="50" cy="50" r="44" fill="none" stroke={C.purple} strokeWidth="6" strokeDasharray="276" strokeDashoffset={276 - (276 * (d.peakPct / 100))} strokeLinecap="round" style={{ transformOrigin: "center", transform: "rotate(-90deg)", transition: "stroke-dashoffset 1s ease" }} />
                      </svg>
                      <div style={{ position: "absolute", textAlign: "center" }}>
                        <p style={{ fontSize: 24, fontWeight: 800, color: C.text, letterSpacing: "-.02em" }}>{d.peakPct}%</p>
                        <p style={{ fontSize: 10, fontWeight: 600, color: C.textFaint, textTransform: "uppercase" }}>Load</p>
                      </div>
                    </div>
                    <div style={{ marginTop: 24, textAlign: "center" }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: C.textSub }}>Peak Concentration</p>
                      <p style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>Most arrivals occur in a single 1-hour window.</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}