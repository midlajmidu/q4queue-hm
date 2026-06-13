"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { SessionResponse, QueueResponse, TokenHistoryItem, AnalyticsOverview } from "@/types/api";
import Link from "next/link";
import { useParams } from "next/navigation";
import { StandardPageHeader } from "@/components/StandardPageHeader";

function formatDate(dateStr: string): string {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function formatTime(isoStr: string | null): string {
    if (!isoStr) return "—";
    return new Date(isoStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const AVATAR_PALETTES = [
  { bg: "#eef2ff", color: "#4f46e5" },
  { bg: "#eff6ff", color: "#3b82f6" },
  { bg: "#f0fdf4", color: "#16a34a" },
  { bg: "#fff7ed", color: "#ea580c" },
  { bg: "#fdf4ff", color: "#9333ea" },
  { bg: "#fdf2f8", color: "#db2777" },
  { bg: "#ecfdf5", color: "#059669" },
  { bg: "#fefce8", color: "#ca8a04" },
];

function getPalette(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}

// ─── Components ─────────────────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
  const { bg, color } = getPalette(name);
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div style={{
      width: 34, height: 34, borderRadius: "50%", background: bg, color, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 12, fontWeight: 700, letterSpacing: "-.01em",
    }}>
      {initials || "U"}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div style={{
      background: "#ffffff", borderRadius: 8, border: "1px solid #e8edf2",
      padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8,
    }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".07em" }}>{label}</span>
      <span className="tabular-nums" style={{ fontSize: 26, fontWeight: 700, color: color ?? "#0f172a", letterSpacing: "-.03em" }}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  let bg = "#f8fafc", color = "#64748b", border = "#e2e8f0";
  
  if (s === "done")         { bg = "#ecfdf5"; color = "#059669"; border = "#a7f3d0"; }
  else if (s === "serving") { bg = "#eff6ff"; color = "#3b82f6"; border = "#bfdbfe"; }
  else if (s === "waiting") { bg = "#fffbeb"; color = "#d97706"; border = "#fde68a"; }
  else if (s === "deleted") { bg = "#fef2f2"; color = "#ef4444"; border = "#fecaca"; }

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "3px 9px",
      borderRadius: 99, fontSize: 11, fontWeight: 600, letterSpacing: ".02em",
      background: bg, color, border: `0.5px solid ${border}`,
    }}>
      {status}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {[80, 180, 120, 80, 80, 80, 80].map((w, i) => (
        <td key={i} style={{ padding: "16px 20px", borderBottom: "0.5px solid #f1f5f9" }}>
          <div style={{ height: 14, width: w, borderRadius: 6, background: "#f1f5f9" }} />
        </td>
      ))}
    </tr>
  );
}

function Pagination({ total, limit, offset, onChange }: { total: number; limit: number; offset: number; onChange: (o: number) => void }) {
  const current = Math.floor(offset / limit) + 1;
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;

  const btnBase: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px",
    fontSize: 13, fontWeight: 500,
    color: "#64748b", background: "#fff", border: "0.5px solid #e2e8f0",
    borderRadius: 9, cursor: "pointer", transition: "all .15s",
  };

  return (
    <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "0.5px solid #f1f5f9" }}>
      <p style={{ fontSize: 13, color: "#94a3b8", fontWeight: 400 }}>
        Showing <span style={{ fontWeight: 600, color: "#0f172a" }}>{offset + 1}</span>–<span style={{ fontWeight: 600, color: "#0f172a" }}>{Math.min(offset + limit, total)}</span> of <span style={{ fontWeight: 600, color: "#0f172a" }}>{total}</span>
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button onClick={() => onChange(offset - limit)} disabled={offset === 0} style={{ ...btnBase, opacity: offset === 0 ? 0.35 : 1, cursor: offset === 0 ? "not-allowed" : "pointer" }}>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg> Prev
        </button>
        <button onClick={() => onChange(offset + limit)} disabled={offset + limit >= total} style={{ ...btnBase, opacity: offset + limit >= total ? 0.35 : 1, cursor: offset + limit >= total ? "not-allowed" : "pointer" }}>
          Next <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>
    </div>
  );
}

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@500&display=swap');`;

export default function HistoryPage() {
    const params = useParams();
    const orgSlug = params?.orgSlug as string;
    const [sessions, setSessions] = useState<SessionResponse[]>([]);
    const [queues, setQueues] = useState<QueueResponse[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string>("");
    const [selectedQueueId, setSelectedQueueId] = useState<string>("");
    const [history, setHistory] = useState<TokenHistoryItem[]>([]);
    const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [secondsAgo, setSecondsAgo] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const PAGE_SIZE = 20;

    useEffect(() => {
        api.listSessions(100, 0).then(res => {
            const data = res.items;
            setSessions(data || []);
            if (data?.length > 0 && !selectedSessionId) setSelectedSessionId(data[0].id);
        }).finally(() => setIsLoading(false));
    }, []);

    useEffect(() => {
        if (selectedSessionId) {
            api.listSessionQueues(selectedSessionId, 100, 0).then(res => {
                setQueues(res.items || []);
                setSelectedQueueId("");
                setOffset(0);
            });
        }
    }, [selectedSessionId]);

    const loadHistory = useCallback(async (isSilent = false) => {
        if (!isSilent) setIsLoading(true);
        setIsRefreshing(true);
        try {
            const [historyData, overviewData] = await Promise.all([
                api.getHistory({
                    sessionId: selectedSessionId || undefined,
                    queueId: selectedQueueId || undefined,
                    limit: PAGE_SIZE,
                    offset
                }),
                api.getOverview({ sessionId: selectedSessionId || undefined, queueId: selectedQueueId || undefined })
            ]);
            setHistory(historyData.items);
            setTotal(historyData.total);
            setOverview(overviewData);
            setLastUpdated(new Date());
            setSecondsAgo(0);
        } catch (err) {
            console.error(err);
        } finally {
            if (!isSilent) setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [selectedSessionId, selectedQueueId, offset]);

    useEffect(() => { 
        loadHistory(); 
        
        // Polling every 10s
        const timer = setInterval(() => {
            loadHistory(true);
        }, 10000);
        
        return () => clearInterval(timer);
    }, [loadHistory]);

    // Update the "seconds ago" ticker
    useEffect(() => {
      const ticker = setInterval(() => {
        if (lastUpdated) setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
      }, 1000);
      return () => clearInterval(ticker);
    }, [lastUpdated]);

    const updatedLabel = lastUpdated
      ? secondsAgo < 10 ? "Just now"
        : secondsAgo < 60 ? "moments ago"
          : `${Math.floor(secondsAgo / 60)}m ago`
      : null;

    const thStyle: React.CSSProperties = {
      padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "#94a3b8",
      textTransform: "uppercase", letterSpacing: ".07em", textAlign: "left",
      borderBottom: "0.5px solid #f1f5f9", background: "#fafbfe",
      whiteSpace: "nowrap",
    };

    const tdStyle: React.CSSProperties = {
      padding: "14px 20px", fontSize: 13.5, fontWeight: 500, color: "#0f172a",
      borderBottom: "0.5px solid #f1f5f9",
    };

    const selectStyle: React.CSSProperties = {
      height: 38, border: "0.5px solid #e2e8f0", borderRadius: 9, padding: "0 30px 0 12px",
      fontSize: 13, fontWeight: 500, color: "#0f172a",
      background: "#fafbfe", outline: "none", appearance: "none", cursor: "pointer",
    };

    return (
        <>
            <style>{FONT_IMPORT}</style>
            <div style={{ display: "flex", flexDirection: "column", gap: 28, WebkitFontSmoothing: "antialiased" }}>
                
                {/* ── Header ── */}
                <StandardPageHeader
                  breadcrumbs={[
                    { label: "Analytics", href: `/${orgSlug}/dashboard/insights` },
                    { label: "History" }
                  ]}
                  title="Queue History"
                  subtitle="Review past sessions, tokens, and detailed performance metrics."
                  icon={<svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  action={
                    /* Filters */
                    <div style={{ display: "flex", gap: 12 }}>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Session</p>
                      <div style={{ position: "relative" }}>
                        <select value={selectedSessionId} onChange={e => setSelectedSessionId(e.target.value)} style={selectStyle}>
                          <option value="">All Sessions</option>
                          {sessions.map(s => (
                            <option key={s.id} value={s.id}>{formatDate(s.session_date)} {s.title ? `(${s.title})` : ""}</option>
                          ))}
                        </select>
                        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><polyline points="6 9 12 15 18 9" /></svg>
                      </div>
                    </div>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Queue</p>
                      <div style={{ position: "relative" }}>
                        <select value={selectedQueueId} onChange={e => setSelectedQueueId(e.target.value)} disabled={!selectedSessionId} style={{ ...selectStyle, opacity: !selectedSessionId ? 0.5 : 1 }}>
                          <option value="">All Queues</option>
                          {queues.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
                        </select>
                        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><polyline points="6 9 12 15 18 9" /></svg>
                      </div>
                    </div>
                  </div>
                }
              >
                {/* Live Indicator */}
                <div style={{ marginLeft: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#ecfdf5", color: "#059669", padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700, letterSpacing: ".05em" }}>
                      <div style={{ width: 6, height: 6, background: "#059669", borderRadius: "50%", animation: "pulse 2s infinite" }} />
                      LIVE
                    </div>
                    {updatedLabel && (
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>
                          Updated {updatedLabel}
                        </span>
                        {isRefreshing && (
                          <svg className="spin" width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                        )}
                      </div>
                    )}
                  </div>
                </StandardPageHeader>

                {/* ── Overview Stats ── */}
                {overview && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
                        <StatCard label="Tokens served" value={overview.status_counts.served} color="#059669" />
                        <StatCard label="Tokens missed" value={overview.status_counts.cancelled} color="#ef4444" />
                        <StatCard label="Avg. Wait time" value={overview.timings.avg_waiting_time} color="#d97706" />
                        <StatCard label="Avg. Service" value={overview.timings.avg_served_time} color="#4f46e5" />
                    </div>
                )}

                {/* ── Table Card ── */}
                <div style={{ background: "#ffffff", borderRadius: 8, border: "1px solid #e8edf2", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "0.5px solid #f1f5f9" }}>
                        <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>Historical Logs</h2>
                        <div className="tabular-nums" style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>
                          {offset + 1}-{Math.min(offset + PAGE_SIZE, total)} OF {total}
                        </div>
                    </div>

                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr>
                                    <th style={thStyle}>Token</th>
                                    <th style={thStyle}>Customer</th>
                                    <th style={thStyle}>Queue</th>
                                    <th style={thStyle}>Status</th>
                                    <th style={thStyle}>Created</th>
                                    <th style={thStyle}>Served</th>
                                    <th style={thStyle}>Finished</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading && history.length === 0 ? (
                                    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                                ) : history.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} style={{ padding: "64px 24px", textAlign: "center" }}>
                                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                                            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#f8fafc", border: "0.5px solid #e8edf2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                                            </div>
                                            <div>
                                              <p style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>
                                                No history found
                                              </p>
                                              <p style={{ fontSize: 13.5, color: "#94a3b8" }}>
                                                Try adjusting the current filters.
                                              </p>
                                            </div>
                                            <button
                                              onClick={() => { setSelectedSessionId(""); setSelectedQueueId(""); }}
                                              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "#4f46e5", background: "#eef2ff", border: "none", borderRadius: 8, cursor: "pointer", transition: "background .15s" }}
                                            >
                                              Clear Filters
                                            </button>
                                          </div>
                                        </td>
                                    </tr>
                                ) : (
                                    history.map((item) => (
                                        <tr key={item.id} onMouseEnter={e => (e.currentTarget.style.background = "#fafbfe")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                            <td style={{ ...tdStyle, color: "#4f46e5", fontWeight: 700 }}>{item.queue_prefix}{item.token_number}</td>
                                            <td style={tdStyle}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                  <Avatar name={item.customer_name} />
                                                  <div style={{ display: "flex", flexDirection: "column" }}>
                                                    <span style={{ fontWeight: 600 }}>{item.customer_name}</span>
                                                    <span style={{ fontSize: 11, color: "#94a3b8" }}>{item.customer_phone}</span>
                                                  </div>
                                                </div>
                                            </td>
                                            <td style={{ ...tdStyle, color: "#64748b" }}>{item.queue_name}</td>
                                            <td style={tdStyle}><StatusBadge status={item.status} /></td>
                                            <td className="tabular-nums" style={{ ...tdStyle, color: "#94a3b8", fontSize: 13 }}>{formatTime(item.created_at)}</td>
                                            <td className="tabular-nums" style={{ ...tdStyle, color: "#94a3b8", fontSize: 13 }}>{formatTime(item.served_at)}</td>
                                            <td className="tabular-nums" style={{ ...tdStyle, color: "#94a3b8", fontSize: 13 }}>{formatTime(item.completed_at)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <Pagination total={total} limit={PAGE_SIZE} offset={offset} onChange={setOffset} />
                </div>
            </div>
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes pulse {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(5, 150, 105, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(5, 150, 105, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(5, 150, 105, 0); }
                }
            `}</style>
        </>
    );
}
