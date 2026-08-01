"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { SessionResponse, QueueResponse, TokenHistoryItem, AnalyticsOverview } from "@/types/api";
import { Users } from "lucide-react";
import { useParams } from "next/navigation";
import { StandardPageHeader } from "@/components/StandardPageHeader";
import TokenDetailModal from "@/components/TokenDetailModal";
import type { TokenDetailData } from "@/components/TokenDetailModal";
import { useBranchTimezone } from "@/context/BranchTimezoneContext";
import { fmtTime, fmtDateTime, fmtDate, localTodayStr, nowInTz } from "@/lib/tzformat";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string, tz: string): string {
    return fmtDate(dateStr + "T12:00:00", tz);
}

function formatTime(isoStr: string | null | undefined, tz: string): string {
    return fmtTime(isoStr, tz);
}

function formatFullTime(isoStr: string | null | undefined, tz: string): string {
    return fmtDateTime(isoStr, tz);
}

function getLocalDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function durationBetween(from: string | null | undefined, to: string | null | undefined): string {
    if (!from || !to) return "—";
    const diffSec = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 1000);
    if (diffSec < 0) return "—";
    const h = Math.floor(diffSec / 3600);
    const m = Math.floor((diffSec % 3600) / 60);
    const s = diffSec % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

function durationSeconds(from: string | null | undefined, to: string | null | undefined): number {
    if (!from || !to) return -1;
    return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 1000);
}

// ─── Components ─────────────────────────────────────────────────────────────

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

function Avatar({ name }: { name: string }) {
    const className = getPalette(name);
    const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    return (
        <div className={"shrink-0 flex items-center justify-center w-[34px] h-[34px] rounded-full text-xs font-bold tracking-tight " + className}>
            {initials || "U"}
        </div>
    );
}

function StatCard({ label, value, sub, color, icon }: {
    label: string; value: string | number; sub?: string; color?: string; icon?: React.ReactNode;
}) {
    return (
        <div style={{
            background: "var(--q-card-bg)", borderRadius: 10, border: "1px solid var(--q-border-light)",
            padding: "18px 20px", display: "flex", flexDirection: "column", gap: 4, position: "relative", overflow: "hidden"
        }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--q-text-muted)", textTransform: "uppercase", letterSpacing: ".07em" }}>{label}</span>
                {icon && <span style={{ opacity: 0.5 }}>{icon}</span>}
            </div>
            <span className="tabular-nums" style={{ fontSize: 26, fontWeight: 800, color: color ?? "var(--q-text)", letterSpacing: "-.03em", lineHeight: 1 }}>{value}</span>
            {sub && <span style={{ fontSize: 11, color: "var(--q-text-muted)", marginTop: 2 }}>{sub}</span>}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const s = status.toLowerCase();
    const map: Record<string, { className: string; label: string }> = {
        done: { className: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/40", label: "Done" },
        serving: { className: "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/40", label: "Serving" },
        waiting: { className: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/40", label: "Waiting" },
        deleted: { className: "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/40", label: "Cancelled" },
        skipped: { className: "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/40", label: "Skipped" },
    };
    const st = map[s] ?? { className: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700", label: status };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${st.className}`}>
            {st.label}
        </span>
    );
}

function WaitTimeBadge({ seconds }: { seconds: number }) {
    if (seconds < 0) return <span className="text-slate-400 dark:text-slate-500">—</span>;
    const isRed = seconds > 900;
    const isAmber = seconds > 300;
    
    const className = isRed 
        ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/40" 
        : isAmber 
        ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/40" 
        : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/40";
        
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const label = m > 0 ? `${m}m ${s}s` : `${s}s`;
    return (
        <span className={`tabular-nums inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${className}`}>
            {label}
        </span>
    );
}

function SkeletonRow() {
    return (
        <tr>
            {[60, 180, 110, 80, 80, 80, 80, 80, 60].map((w, i) => (
                <td key={i} style={{ padding: "14px 16px", borderBottom: "0.5px solid var(--q-border-light)" }}>
                    <div style={{ height: 13, width: w, borderRadius: 6, background: "var(--q-slate-bg)" }} />
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
        color: "var(--q-text-muted)", background: "transparent", border: "1px solid var(--q-border-light)",
        borderRadius: 9, cursor: "pointer", transition: "all .15s",
    };
    return (
        <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "0.5px solid var(--q-border-light)" }}>
            <p style={{ fontSize: 13, color: "var(--q-text-muted)", fontWeight: 400 }}>
                Showing <strong style={{ color: "var(--q-text)" }}>{offset + 1}</strong>–<strong style={{ color: "var(--q-text)" }}>{Math.min(offset + limit, total)}</strong> of <strong style={{ color: "var(--q-text)" }}>{total}</strong>
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button onClick={() => onChange(offset - limit)} disabled={offset === 0} style={{ ...btnBase, opacity: offset === 0 ? 0.35 : 1, cursor: offset === 0 ? "not-allowed" : "pointer" }}>
                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg> Prev
                </button>
                <span style={{ fontSize: 13, color: "var(--q-text-muted)", padding: "0 6px" }}>
                    {current} / {pages}
                </span>
                <button onClick={() => onChange(offset + limit)} disabled={offset + limit >= total} style={{ ...btnBase, opacity: offset + limit >= total ? 0.35 : 1, cursor: offset + limit >= total ? "not-allowed" : "pointer" }}>
                    Next <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                </button>
            </div>
        </div>
    );
}

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@500&display=swap');`;

const STATUS_OPTIONS = [
    { value: "", label: "All Statuses" },
    { value: "done", label: "Done" },
    { value: "waiting", label: "Waiting" },
    { value: "serving", label: "Serving" },
    { value: "skipped", label: "Skipped" },
    { value: "deleted", label: "Cancelled" },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HistoryPage() {
    const params = useParams();
    const orgSlug = params?.orgSlug as string;

    const tz = useBranchTimezone();
    const today = localTodayStr(tz);
    const last7 = getLocalDateStr(new Date(nowInTz(tz).getTime() - 6 * 86400000));

    const [queues, setQueues] = useState<QueueResponse[]>([]);
    const [selectedQueueId, setSelectedQueueId] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [startDate, setStartDate] = useState(last7);
    const [endDate, setEndDate] = useState(today);
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
    const PAGE_SIZE = 25;

    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedSearch(searchQuery); setOffset(0); }, 400);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    const handleExport = async () => {
        setExporting(true);
        try {
            const blob = await api.exportAnalyticsCSV({
                queueId: selectedQueueId || undefined,
                search: debouncedSearch || undefined,
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Customer_Logs_${today}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error("Export failed", err);
            alert("Export failed.");
        } finally {
            setExporting(false);
        }
    };

    useEffect(() => {
        api.listQueues().then(setQueues).finally(() => setIsLoading(false));
    }, []);

    const loadHistory = useCallback(async (isSilent = false) => {
        if (!isSilent) setIsLoading(true);
        setIsRefreshing(true);
        try {
            const [historyData, overviewData] = await Promise.all([
                api.getHistory({
                    queueId: selectedQueueId || undefined,
                    search: debouncedSearch || undefined,
                    status: selectedStatus || undefined,
                    limit: PAGE_SIZE,
                    offset,
                }),
                api.getOverview({
                    queueId: selectedQueueId || undefined,
                    startDate: startDate || undefined,
                    endDate: endDate || undefined,
                })
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
    }, [selectedQueueId, offset, debouncedSearch, selectedStatus, startDate, endDate]);

    useEffect(() => {
        loadHistory();
        const timer = setInterval(() => loadHistory(true), 15000);
        return () => clearInterval(timer);
    }, [loadHistory]);

    useEffect(() => {
        const ticker = setInterval(() => {
            if (lastUpdated) setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
        }, 1000);
        return () => clearInterval(ticker);
    }, [lastUpdated]);

    const updatedLabel = lastUpdated
        ? secondsAgo < 10 ? "Just now" : secondsAgo < 60 ? "moments ago" : `${Math.floor(secondsAgo / 60)}m ago`
        : null;

    const thStyle: React.CSSProperties = {
        padding: "10px 16px", fontSize: 11, fontWeight: 700, color: "var(--q-text-muted)",
        textTransform: "uppercase", letterSpacing: ".07em", textAlign: "left",
        borderBottom: "1px solid var(--q-border-light)", background: "var(--q-slate-bg)",
        whiteSpace: "nowrap",
    };
    const tdStyle: React.CSSProperties = {
        padding: "13px 16px", fontSize: 13, fontWeight: 500, color: "var(--q-text)",
        borderBottom: "1px solid var(--q-border-light)",
    };
    const selectStyle: React.CSSProperties = {
        height: 36, border: "1px solid var(--q-border-light)", borderRadius: 8, padding: "0 28px 0 10px",
        fontSize: 13, fontWeight: 500, color: "var(--q-text)",
        background: "var(--q-card-bg)", outline: "none", appearance: "none", cursor: "pointer",
    };

    const sc = overview?.status_counts;
    const timings = overview?.timings;

    return (
        <>
            <style>{FONT_IMPORT}</style>
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes pulse {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(5, 150, 105, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(5, 150, 105, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(5, 150, 105, 0); }
                }
                .cl-row:hover { background: var(--q-slate-bg); }
                .cl-filter-btn { transition: all .15s ease; }
                .cl-filter-btn:hover { border-color: #6366f1 !important; }
            `}</style>
            <div style={{ display: "flex", flexDirection: "column", gap: 24, WebkitFontSmoothing: "antialiased" }}>

                {/* ── Header ── */}
                <StandardPageHeader
                    breadcrumbs={[
                        { label: "Analytics", href: `/${orgSlug}/dashboard/insights` },
                        { label: "Customer Logs" }
                    ]}
                    title="Customer Logs"
                    subtitle="Complete record of every customer interaction, token, and queue event."
                    icon={<svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
                    action={
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
                            {/* Search */}
                            <div>
                                <p style={{ fontSize: 10, fontWeight: 700, color: "var(--q-text-muted)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 5 }}>Search</p>
                                <div style={{ position: "relative" }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--q-text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
                                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                    <input type="text" placeholder="Name, phone, token..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                        style={{ ...selectStyle, paddingLeft: 32, width: 190 }} />
                                </div>
                            </div>

                            {/* Queue */}
                            <div>
                                <p style={{ fontSize: 10, fontWeight: 700, color: "var(--q-text-muted)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 5 }}>Queue</p>
                                <div style={{ position: "relative" }}>
                                    <select value={selectedQueueId} onChange={e => { setSelectedQueueId(e.target.value); setOffset(0); }} style={selectStyle}>
                                        <option value="">All Queues</option>
                                        {queues.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
                                    </select>
                                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="var(--q-text-muted)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><polyline points="6 9 12 15 18 9" /></svg>
                                </div>
                            </div>

                            {/* Status */}
                            <div>
                                <p style={{ fontSize: 10, fontWeight: 700, color: "var(--q-text-muted)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 5 }}>Status</p>
                                <div style={{ position: "relative" }}>
                                    <select value={selectedStatus} onChange={e => { setSelectedStatus(e.target.value); setOffset(0); }} style={selectStyle}>
                                        {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="var(--q-text-muted)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><polyline points="6 9 12 15 18 9" /></svg>
                                </div>
                            </div>

                            {/* Date range */}
                            <div>
                                <p style={{ fontSize: 10, fontWeight: 700, color: "var(--q-text-muted)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 5 }}>From</p>
                                <input type="date" max={today} value={startDate} onChange={e => setStartDate(e.target.value)}
                                    style={{ ...selectStyle, padding: "0 10px", colorScheme: "light dark" }} />
                            </div>
                            <div>
                                <p style={{ fontSize: 10, fontWeight: 700, color: "var(--q-text-muted)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 5 }}>To</p>
                                <input type="date" max={today} value={endDate} onChange={e => setEndDate(e.target.value)}
                                    style={{ ...selectStyle, padding: "0 10px", colorScheme: "light dark" }} />
                            </div>

                            {/* Export */}
                            <button onClick={handleExport} disabled={exporting} style={{
                                height: 36, padding: "0 14px", borderRadius: 8,
                                background: "#4f46e5", color: "#fff", fontSize: 13, fontWeight: 600,
                                border: "none", cursor: exporting ? "not-allowed" : "pointer",
                                display: "flex", alignItems: "center", gap: 6,
                                opacity: exporting ? 0.7 : 1, transition: "all .15s",
                            }}>
                                {exporting
                                    ? <><svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-6.219-8.56" /></svg> Exporting…</>
                                    : <><svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> Export CSV</>
                                }
                            </button>
                        </div>
                    }
                >
                    {/* Live indicator */}
                    <div style={{ marginLeft: 8, display: "flex", alignItems: "center", gap: 8 }}>
                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-900/40">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            LIVE
                        </div>
                        {updatedLabel && (
                            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                <span style={{ fontSize: 11, color: "var(--q-text-muted)", fontWeight: 500 }}>Updated {updatedLabel}</span>
                                {isRefreshing && <svg style={{ animation: "spin 1s linear infinite" }} width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="var(--q-text-muted)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>}
                            </div>
                        )}
                    </div>
                </StandardPageHeader>

                {/* ── Stat Cards ── */}
                {overview && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
                        <StatCard label="Total Tokens" value={sc?.total ?? 0}
                            icon={<svg width={16} height={16} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>}
                        />
                        <StatCard label="Served" value={sc?.served ?? 0} color="#059669"
                            icon={<svg width={16} height={16} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                        />
                        <StatCard label="Cancelled" value={sc?.cancelled ?? 0} color="#ef4444"
                            icon={<svg width={16} height={16} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                        />
                        <StatCard label="Waiting Now" value={sc?.waiting ?? 0} color="#d97706"
                            icon={<svg width={16} height={16} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                        />
                        <StatCard label="Avg Wait" value={timings?.avg_waiting_time ?? "—"} color="#6366f1"
                            sub={timings?.max_waiting_time ? `Max: ${timings.max_waiting_time}` : undefined}
                            icon={<svg width={16} height={16} fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                        />
                        <StatCard label="Avg Service" value={timings?.avg_served_time ?? "—"} color="#0891b2"
                            icon={<svg width={16} height={16} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                        />
                    </div>
                )}

                {/* ── Table Card ── */}
                <div style={{ background: "var(--q-card-bg)", borderRadius: 10, border: "1px solid var(--q-border-light)", boxShadow: "0 1px 4px rgba(0,0,0,.04)", overflow: "hidden" }}>
                    {/* Table header bar */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", borderBottom: "1px solid var(--q-border-light)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--q-text)" }}>Customer Log</h2>
                            {selectedStatus && (
                                <StatusBadge status={selectedStatus} />
                            )}
                        </div>
                        <div className="tabular-nums" style={{ fontSize: 12, fontWeight: 600, color: "var(--q-text-muted)" }}>
                            {total > 0 ? `${offset + 1}–${Math.min(offset + PAGE_SIZE, total)} of ${total}` : "0 records"}
                        </div>
                    </div>

                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr>
                                    <th style={thStyle}>Token</th>
                                    <th style={thStyle}>Customer</th>
                                    <th style={thStyle}>Queue</th>
                                    <th style={thStyle}>Entry</th>
                                    <th style={thStyle}>Status</th>
                                    <th style={thStyle}>Issued</th>
                                    <th style={thStyle}>Called</th>
                                    <th style={thStyle}>Wait Time</th>
                                    <th style={thStyle}>Service Time</th>
                                    <th style={thStyle}>Served By</th>
                                    <th style={thStyle}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading && history.length === 0 ? (
                                    Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                                ) : history.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} style={{ padding: "60px 24px", textAlign: "center" }}>
                                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                                                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--q-slate-bg)", border: "0.5px solid var(--q-border-light)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="var(--q-text-muted)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--q-text)", marginBottom: 4 }}>No records found</p>
                                                    <p style={{ fontSize: 13, color: "var(--q-text-muted)" }}>Try adjusting your filters or date range.</p>
                                                </div>
                                                <button onClick={() => { setSelectedQueueId(""); setSelectedStatus(""); setSearchQuery(""); }}
                                                    style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", fontSize: 13, fontWeight: 600, border: "1px solid var(--q-border-light)", borderRadius: 8, cursor: "pointer", background: "var(--q-card-bg)", color: "var(--q-text)", transition: "all .15s" }}>
                                                    Clear all filters
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    history.map((h) => {
                                        const waitSec = durationSeconds(h.created_at, h.served_at);
                                        const serveSec = durationSeconds(h.served_at, h.completed_at);
                                        return (
                                            <tr key={h.id} className="cl-row" style={{ transition: "background .1s" }}>
                                                {/* Token */}
                                                <td className="text-indigo-600 dark:text-indigo-400" style={{ ...tdStyle, fontWeight: 700, fontSize: 14 }}>
                                                    {h.queue_prefix}{h.token_number}
                                                </td>
                                                {/* Customer */}
                                                <td style={tdStyle}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                        {/* Avatar removed as per request */}
                                                        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                                                            <span style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                                                <span style={{ whiteSpace: "nowrap" }}>
                                                                    {h.customer_name ? h.customer_name.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ") : "—"}
                                                                </span>
                                                                {(h.pax_count && h.pax_count > 1) && (
                                                                    <span className="inline-flex items-center gap-1 font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px] border border-slate-200 dark:border-slate-700" title={`Total Pax: ${h.pax_count}`}>
                                                                        <Users size={9} />{h.pax_count}
                                                                    </span>
                                                                )}
                                                            </span>
                                                            <span style={{ fontSize: 11, color: "var(--q-text-muted)" }}>{h.customer_phone}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                {/* Queue */}
                                                <td style={{ ...tdStyle, color: "var(--q-text-sub)", whiteSpace: "nowrap" }}>{h.queue_name}</td>
                                                {/* Entry method */}
                                                <td style={tdStyle}>
                                                    {h.called_via_invite ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900/40">Invited</span>
                                                    ) : (h.entry_type === "manual" || h.entry_type === "auto") ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/40">
                                                            {h.entry_type === "manual" ? "Manual" : "Auto"}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200/80 dark:border-cyan-900/40">
                                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                <rect x="3" y="3" width="7" height="7"/>
                                                                <rect x="14" y="3" width="7" height="7"/>
                                                                <rect x="14" y="14" width="7" height="7"/>
                                                                <rect x="3" y="14" width="7" height="7"/>
                                                            </svg>
                                                            QR
                                                        </span>
                                                    )}
                                                </td>
                                                {/* Status */}
                                                <td style={tdStyle}><StatusBadge status={h.status} /></td>
                                                 {/* Issued */}
                                                <td className="tabular-nums" style={{ ...tdStyle, color: "var(--q-text-muted)", fontSize: 12, whiteSpace: "nowrap" }}>
                                                    {formatFullTime(h.created_at, tz)}
                                                </td>
                                                {/* Called */}
                                                <td className="tabular-nums" style={{ ...tdStyle, color: "var(--q-text-muted)", fontSize: 12, whiteSpace: "nowrap" }}>
                                                    {h.skipped_at && !h.served_at ? (
                                                        <span title={`Skipped at ${formatFullTime(h.skipped_at, tz)}`} className="text-purple-600 dark:text-purple-400">Skipped {formatTime(h.skipped_at, tz)}</span>
                                                    ) : h.recalled_at ? (
                                                        <span title={`Recalled at ${formatFullTime(h.recalled_at, tz)}`}>{formatTime(h.served_at, tz)} <span className="text-sky-500 dark:text-sky-400 text-[10px] font-semibold">(recalled)</span></span>
                                                    ) : formatTime(h.served_at, tz)}
                                                </td>
                                                {/* Wait Time */}
                                                <td style={tdStyle}><WaitTimeBadge seconds={waitSec} /></td>
                                                {/* Service Time */}
                                                <td className="tabular-nums" style={{ ...tdStyle, color: "var(--q-text-sub)", fontSize: 12 }}>
                                                    {durationBetween(h.served_at, h.completed_at)}
                                                </td>
                                                {/* Served By */}
                                                <td style={{ ...tdStyle, color: "var(--q-text-sub)", fontSize: 12, whiteSpace: "nowrap" }}>
                                                    {h.served_by_staff_name || <span style={{ color: "var(--q-text-muted)" }}>—</span>}
                                                </td>
                                                {/* View button */}
                                                <td style={{ ...tdStyle, textAlign: "right", whiteSpace: "nowrap" }}>
                                                    <button
                                                        onClick={() => setSelectedToken({
                                                            token_number: h.token_number,
                                                            prefix: h.queue_prefix || "",
                                                            customer_name: h.customer_name,
                                                            customer_phone: h.customer_phone,
                                                            pax_count: h.pax_count,
                                                            status: h.status,
                                                            created_at: h.created_at,
                                                            served_at: h.served_at,
                                                            completed_at: h.completed_at,
                                                            entry_type: h.entry_type || "qr",
                                                            queue_name: h.queue_name,
                                                            called_via_invite: h.called_via_invite,
                                                            skipped_at: h.skipped_at,
                                                            deleted_at: h.deleted_at,
                                                            recalled_at: h.recalled_at,
                                                            removed_by: h.removed_by,
                                                            served_by_staff_name: h.served_by_staff_name,
                                                            completed_by_staff_name: h.completed_by_staff_name,
                                                        })}
                                                        title="View full details"
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:border-indigo-200 dark:hover:border-indigo-800/50 transition-colors"
                                                    >
                                                        <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                        Details
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    <Pagination total={total} limit={PAGE_SIZE} offset={offset} onChange={setOffset} />
                </div>
            </div>

            <TokenDetailModal token={selectedToken} onClose={() => setSelectedToken(null)} />
        </>
    );
}
