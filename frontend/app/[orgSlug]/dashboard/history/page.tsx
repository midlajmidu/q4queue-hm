"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { SessionResponse, QueueResponse, TokenHistoryItem, AnalyticsOverview } from "@/types/api";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Users } from "lucide-react";
import { StandardPageHeader } from "@/components/StandardPageHeader";
import TokenDetailModal from "@/components/TokenDetailModal";
import type { TokenDetailData } from "@/components/TokenDetailModal";

function formatDate(dateStr: string): string {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
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
  "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400",
  "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400",
  "bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
  "bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400",
  "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400",
];

function getPalette(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}

// ─── Components ─────────────────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
  const className = getPalette(name);
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div className={"shrink-0 flex items-center justify-center w-[34px] h-[34px] rounded-full text-xs font-bold tracking-tight " + className}>
      {initials || "U"}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div style={{
      background: "var(--q-card-bg)", borderRadius: 8, border: "1px solid var(--q-border-light)",
      padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8,
    }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--q-text-muted)", textTransform: "uppercase", letterSpacing: ".07em" }}>{label}</span>
      <span className="tabular-nums" style={{ fontSize: 26, fontWeight: 700, color: color ?? "var(--q-text)", letterSpacing: "-.03em" }}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  let bg = "var(--q-slate-bg)", color = "var(--q-text-muted)", border = "var(--q-borderLight)";
  
  if (s === "done")         { bg = "var(--q-green-bg)"; color = "var(--q-green)"; border = "var(--q-green-border)"; }
  else if (s === "serving") { bg = "var(--q-blue-bg)"; color = "var(--q-blue)"; border = "var(--q-blue-border)"; }
  else if (s === "waiting") { bg = "var(--q-amber-bg)"; color = "var(--q-amber)"; border = "var(--q-amber-border)"; }
  else if (s === "deleted") { bg = "var(--q-red-bg)"; color = "var(--q-red)"; border = "var(--q-red-border)"; }

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
      {[80, 180, 120, 90, 80, 80, 80, 80].map((w, i) => (
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
    color: "var(--q-text-muted)", background: "transparent", border: "1px solid var(--q-borderLight)",
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
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [selectedToken, setSelectedToken] = useState<TokenDetailData | null>(null);
    const [history, setHistory] = useState<TokenHistoryItem[]>([]);
    const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [secondsAgo, setSecondsAgo] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [exporting, setExporting] = useState(false);
    const PAGE_SIZE = 20;

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setOffset(0);
        }, 400);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    const handleExport = async () => {
        setExporting(true);
        try {
            const blob = await api.exportAnalyticsCSV({
                sessionId: selectedSessionId || undefined,
                queueId: selectedQueueId || undefined,
                search: debouncedSearch || undefined,
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Customer_Logs.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error("Failed to export CSV", err);
            alert("Failed to export data.");
        } finally {
            setExporting(false);
        }
    };

    useEffect(() => {
        api.listSessions(100, 0).then(res => {
            const data = res.items;
            setSessions(data || []);
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
                    search: debouncedSearch || undefined,
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
    }, [selectedSessionId, selectedQueueId, offset, debouncedSearch]);

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
      padding: "10px 20px", fontSize: 11, fontWeight: 600, color: "var(--q-text-muted)",
      textTransform: "uppercase", letterSpacing: ".07em", textAlign: "left",
      borderBottom: "1px solid var(--q-border-light)", background: "var(--q-slate-bg)",
      whiteSpace: "nowrap",
    };

    const tdStyle: React.CSSProperties = {
      padding: "14px 20px", fontSize: 13.5, fontWeight: 500, color: "var(--q-text)",
      borderBottom: "1px solid var(--q-border-light)",
    };

    const selectStyle: React.CSSProperties = {
      height: 38, border: "1px solid var(--q-borderLight)", borderRadius: 9, padding: "0 30px 0 12px",
      fontSize: 13, fontWeight: 500, color: "var(--q-text)",
      background: "var(--q-card-bg-alt)", outline: "none", appearance: "none", cursor: "pointer",
    };

    return (
        <>
            <style>{FONT_IMPORT}</style>
            <div style={{ display: "flex", flexDirection: "column", gap: 28, WebkitFontSmoothing: "antialiased" }}>
                
                {/* ── Header ── */}
                <StandardPageHeader
                  breadcrumbs={[
                    { label: "Analytics", href: `/${orgSlug}/dashboard/insights` },
                    { label: "Customers" }
                  ]}
                  title="Customer Logs"
                  subtitle="Review customer logs, past interactions, and tokens."
                  icon={<svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  action={
                    /* Filters */
                    <div style={{ display: "flex", gap: 12 }}>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Search</p>
                      <div style={{ position: "relative" }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input
                          type="text"
                          placeholder="Search..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          style={{
                              ...selectStyle,
                              paddingLeft: 34,
                              width: 160
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Session</p>
                      <div style={{ position: "relative" }}>
                        <select value={selectedSessionId} onChange={e => setSelectedSessionId(e.target.value)} style={selectStyle}>
                          <option value="">All Sessions</option>
                          {sessions.map(s => (
                            <option key={s.id} value={s.id}>{formatDate(s.session_date)}</option>
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
                    
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        style={{
                            height: 38,
                            padding: "0 16px",
                            borderRadius: 8,
                            background: "#4f46e5",
                            color: "#fff",
                            fontSize: 13,
                            fontWeight: 600,
                            border: "none",
                            cursor: exporting ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            opacity: exporting ? 0.7 : 1,
                            transition: "all .15s",
                            alignSelf: "flex-end"
                        }}
                    >
                        {exporting ? (
                            <>
                                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>
                                Exporting...
                            </>
                        ) : (
                            <>
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Export CSV
                            </>
                        )}
                    </button>
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
                <div style={{ background: "var(--q-card-bg)", borderRadius: 8, border: "1px solid var(--q-border-light)", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--q-border-light)" }}>
                        <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--q-text)" }}>Customer Logs</h2>
                        <div className="tabular-nums" style={{ fontSize: 12, fontWeight: 600, color: "var(--q-text-muted)" }}>
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
                                    <th style={thStyle}>Method</th>
                                    <th style={thStyle}>Status</th>
                                    <th style={thStyle}>Created</th>
                                    <th style={thStyle}>Served</th>
                                    <th style={thStyle}>Finished / Left</th>
                                    <th style={thStyle}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading && history.length === 0 ? (
                                    Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                                ) : history.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} style={{ padding: "64px 24px", textAlign: "center" }}>
                                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                                            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#f8fafc", border: "0.5px solid #e8edf2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                                            </div>
                                            <div>
                                              <p style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>
                                                No customers found
                                              </p>
                                              <p style={{ fontSize: 13.5, color: "#94a3b8" }}>
                                                Try adjusting the current filters.
                                              </p>
                                            </div>
                                            <button
                                              onClick={() => { setSelectedSessionId(""); setSelectedQueueId(""); }}
                                              className="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                                              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 13, fontWeight: 600, border: "none", borderRadius: 8, cursor: "pointer", transition: "background .15s" }}
                                            >
                                              Clear Filters
                                            </button>
                                          </div>
                                        </td>
                                    </tr>
                                ) : (
                                    history.map((h) => (
                                        <tr key={h.id} className="hover:bg-[#fafbfe] dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="text-indigo-600 dark:text-indigo-400" style={{ ...tdStyle, fontWeight: 700 }}>{h.queue_prefix}{h.token_number}</td>
                                            <td style={tdStyle}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                  <Avatar name={h.customer_name ? h.customer_name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : ""} />
                                                  <div style={{ display: "flex", flexDirection: "column" }}>
                                                    <span style={{ fontWeight: 600 }}>
                                                      {h.customer_name ? h.customer_name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : '-'}
                                                      {(h.companion_names && h.companion_names.length > 0) && (
                                                          <span style={{ fontWeight: 500, color: "#6366f1", backgroundColor: "rgba(99, 102, 241, 0.1)", padding: "2px 6px", borderRadius: "4px", marginLeft: 6, display: "inline-flex", alignItems: "center", gap: 2, textTransform: "none" }} title={h.companion_names.join(", ")}>
                                                              <Users style={{ width: 12, height: 12 }} /> +{h.companion_names.length}
                                                          </span>
                                                      )}
                                                    </span>
                                                    <span style={{ fontSize: 11, color: "#94a3b8" }}>{h.customer_phone}</span>
                                                  </div>
                                                </div>
                                            </td>
                                            <td style={{ ...tdStyle, color: "#64748b" }}>{h.queue_name}</td>
                                            <td style={{ ...tdStyle, color: "#64748b" }}>
                                                {h.called_via_invite ? (
                                                    <span style={{ fontSize: 11, background: "#fdf4ff", color: "#c026d3", padding: "2px 6px", borderRadius: 4, border: "1px solid #f5d0fe", fontWeight: 600 }}>Invited</span>
                                                ) : (
                                                    <span style={{ fontSize: 11, background: "#f1f5f9", color: "#64748b", padding: "2px 6px", borderRadius: 4, border: "1px solid #e2e8f0", fontWeight: 600 }}>Call Next</span>
                                                )}
                                            </td>
                                            <td style={tdStyle}><StatusBadge status={h.status} /></td>
                                            <td className="tabular-nums" style={{ ...tdStyle, color: "#94a3b8", fontSize: 13 }}>{formatTime(h.created_at)}</td>
                                            <td className="tabular-nums" style={{ ...tdStyle, color: "#94a3b8", fontSize: 13 }}>{formatTime(h.served_at)}</td>
                                            <td style={tdStyle}>{formatTime(h.completed_at || h.deleted_at || h.skipped_at || null)}</td>
                                            <td style={{ ...tdStyle, textAlign: "right" }}>
                                                <button
                                                    onClick={() => setSelectedToken({
                                                        token_number: h.token_number,
                                                        prefix: h.queue_prefix || "",
                                                        customer_name: h.customer_name,
                                                        customer_age: h.customer_age,
                                                        customer_phone: h.customer_phone,
                                                        companion_names: h.companion_names || [],
                                                        status: h.status,
                                                        created_at: h.created_at,
                                                        served_at: h.served_at,
                                                        completed_at: h.completed_at,
                                                        entry_type: h.entry_type || "qr", // Fallback for history
                                                        queue_name: h.queue_name,
                                                        called_via_invite: h.called_via_invite,
                                                        skipped_at: h.skipped_at,
                                                        deleted_at: h.deleted_at,
                                                        recalled_at: h.recalled_at,
                                                        removed_by: h.removed_by,
                                                        served_by_staff_name: h.served_by_staff_name,
                                                        completed_by_staff_name: h.completed_by_staff_name
                                                    })}
                                                    style={{ padding: "6px", background: "transparent", border: "1px solid #e2e8f0", borderRadius: 7, cursor: "pointer", transition: "all .15s" }}
                                                    onMouseEnter={e => { e.currentTarget.style.color = "#4f46e5"; e.currentTarget.style.borderColor = "#4f46e5"; }}
                                                    onMouseLeave={e => { e.currentTarget.style.color = "inherit"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
                                                >
                                                    <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <Pagination total={total} limit={PAGE_SIZE} offset={offset} onChange={setOffset} />
                </div>
            </div>

            <TokenDetailModal 
                token={selectedToken} 
                onClose={() => setSelectedToken(null)} 
            />
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
