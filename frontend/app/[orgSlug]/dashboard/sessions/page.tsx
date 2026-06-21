"use client";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Plus, Layers, Users } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { SessionResponse } from "@/types/api";
import { useAuth } from "@/hooks/useAuth";

// ─── Date helpers ────────────────────────────────────────────────
function toLocalDateStr(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function isToday(dateStr: string): boolean {
    return dateStr === toLocalDateStr();
}

function isYesterday(dateStr: string): boolean {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const ys = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
    return dateStr === ys;
}

function isTomorrow(dateStr: string): boolean {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    const ts = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
    return dateStr === ts;
}

function isThisWeek(dateStr: string): boolean {
    const d = new Date(dateStr + "T00:00:00");
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return d >= startOfWeek && d <= endOfWeek;
}

function formatFullDate(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatShortDate(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
}

function getDayNumber(dateStr: string): string {
    return new Date(dateStr + "T00:00:00").getDate().toString();
}

function getMonthShort(dateStr: string): string {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short" }).toUpperCase();
}

type TimelineLabel = "Today" | "Tomorrow" | "Yesterday" | "This Week" | "Earlier";

function getTimelineGroup(dateStr: string): TimelineLabel {
    if (isToday(dateStr)) return "Today";
    if (isTomorrow(dateStr)) return "Tomorrow";
    if (isYesterday(dateStr)) return "Yesterday";
    if (isThisWeek(dateStr)) return "This Week";
    return "Earlier";
}

interface GroupedSessions { label: TimelineLabel; sessions: SessionResponse[] }

function groupByTimeline(sessions: SessionResponse[]): GroupedSessions[] {
    const order: TimelineLabel[] = ["Tomorrow", "Today", "Yesterday", "This Week", "Earlier"];
    const map = new Map<TimelineLabel, SessionResponse[]>();
    for (const s of sessions) {
        const label = getTimelineGroup(s.session_date);
        if (!map.has(label)) map.set(label, []);
        map.get(label)!.push(s);
    }
    return order.filter(l => map.has(l)).map(l => ({ label: l, sessions: map.get(l)! }));
}

// ─── Component ───────────────────────────────────────────────────
export default function SessionsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const isStaff = user?.role === "staff";
    const dashBase = user?.org_slug ? `/${user.org_slug}/dashboard` : "/dashboard";

    const [sessions, setSessions] = useState<SessionResponse[]>([]);
    const [queueList, setQueueList] = useState<string[]>([]);
    const [selectedQueue, setSelectedQueue] = useState<string>("");
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [filterDate, setFilterDate] = useState("");
    const LIMIT = 20;
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Create modal
    const [showCreate, setShowCreate] = useState(false);
    const [newDate, setNewDate] = useState(() => toLocalDateStr());
    const [newTitle, setNewTitle] = useState("");
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const dateRef = useRef<HTMLInputElement>(null);

    // Delete
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.listSessions(LIMIT, (page - 1) * LIMIT, filterDate || undefined);
            setSessions(res.items || []);
            setTotal(res.total);
        } catch (err: unknown) {
            if (err instanceof Error) setError(err.message);
            else setError("Failed to load sessions");
        } finally {
            setIsLoading(false);
        }
    }, [page, filterDate]);

    useEffect(() => { loadData(); }, [loadData]);

    // Fetch unique queue names for the dropdown
    useEffect(() => {
        api.listQueues().then(queues => {
            const unique = Array.from(new Set(queues.map(q => q.name))).sort();
            setQueueList(unique);
        }).catch(() => { });
    }, []);

    useEffect(() => {
        if (searchParams.get("alert") === "no_session") {
            if (!isStaff) setShowCreate(true);
            router.replace(`${dashBase}/sessions`);
        }
    }, [searchParams, isStaff, user, router, dashBase]);

    useEffect(() => {
        if (showCreate) {
            setNewDate(toLocalDateStr());
            setNewTitle("");
            setCreateError(null);
            setTimeout(() => dateRef.current?.focus(), 100);
        }
    }, [showCreate]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDate) return;
        setCreateLoading(true);
        setCreateError(null);
        try {
            const created = await api.createSession({ session_date: newDate, title: newTitle.trim() || undefined });
            setShowCreate(false);
            router.push(`${dashBase}/sessions/${created.id}/queues`);
        } catch (err: unknown) {
            if (err instanceof ApiError) setCreateError(err.detail);
            else setCreateError("Failed to create session");
        } finally {
            setCreateLoading(false);
        }
    };

    const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (!confirm("Delete this session and ALL its queues and tokens? This cannot be undone.")) return;
        setDeletingId(sessionId);
        try {
            await api.deleteSession(sessionId);
            await loadData();
        } catch (err: unknown) {
            alert(err instanceof ApiError ? err.detail : "Failed to delete session");
        } finally {
            setDeletingId(null);
        }
    };

    const filteredSessions = useMemo(() => {
        if (!selectedQueue) return sessions;
        return sessions.filter(session =>
            session.queue_names?.includes(selectedQueue)
        );
    }, [sessions, selectedQueue]);

    const grouped = useMemo(() => groupByTimeline(filteredSessions), [filteredSessions]);

    return (
        <div>
            {/* ── Page Header ── */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 32 }}>
                <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: "#94A3B8", marginBottom: 8 }}>
                        <Link href={dashBase} style={{ color: "inherit", textDecoration: "none" }}>Organization</Link>
                        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                        <span style={{ color: "#475569" }}>Sessions</span>
                    </div>
                    <h1 style={{ fontSize: 22, fontWeight: 600, color: "#0F172A", margin: 0, letterSpacing: "-0.025em" }}>Sessions</h1>
                    <p style={{ fontSize: 13, color: "#94A3B8", margin: "4px 0 0", fontWeight: 400 }}>Your service timeline — organised by date.</p>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {/* Queue filter */}
                    <div style={{ position: "relative" }}>
                        <select
                            value={selectedQueue}
                            onChange={(e) => setSelectedQueue(e.target.value)}
                            style={{ height: 36, paddingLeft: 12, paddingRight: 32, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13, color: "#374151", appearance: "none" as const, outline: "none", cursor: "pointer" }}
                        >
                            <option value="">All Queues</option>
                            {queueList.map(name => (
                                <option key={name} value={name}>{name}</option>
                            ))}
                        </select>
                        <svg style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                    </div>
                    {/* Date filter */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, height: 36, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, paddingLeft: 10, paddingRight: 10, fontSize: 13, color: "#374151" }}>
                        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x={3} y={4} width={18} height={18} rx={2} /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                        <input
                            type="date"
                            value={filterDate}
                            max={toLocalDateStr()}
                            onChange={(e) => { setFilterDate(e.target.value); setPage(1); }}
                            style={{ background: "transparent", border: "none", outline: "none", fontSize: 13, color: "#374151", fontWeight: 500 }}
                        />
                        {filterDate && (
                            <button onClick={() => { setFilterDate(""); setPage(1); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                                <svg width={14} height={14} viewBox="0 0 20 20" fill="#94A3B8"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                            </button>
                        )}
                    </div>
                    {/* Create */}
                    {!isStaff && (
                        <button
                            onClick={() => setShowCreate(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg h-10 px-4 transition-all duration-200 active:scale-[0.98] flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            New Session
                        </button>
                    )}
                </div>
            </div>

            {/* ── Error ── */}
            {error && (
                <div role="alert" style={{ marginBottom: 24, background: "#FEF2F2", color: "#B91C1C", padding: "12px 16px", borderRadius: 8, border: "1px solid #FECACA", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>{error}</span>
                    <button onClick={loadData} style={{ background: "none", border: "none", textDecoration: "underline", fontWeight: 600, color: "inherit", cursor: "pointer" }}>Retry</button>
                </div>
            )}

            {/* ── Loading ── */}
            {isLoading ? (
                <div style={{ textAlign: "center", padding: "96px 0" }}>
                    <div style={{ width: 32, height: 32, border: "3px solid #F1F5F9", borderTopColor: "#2563EB", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
                    <p style={{ fontSize: 13, color: "#94A3B8", fontWeight: 500 }}>Loading sessions...</p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            ) : filteredSessions.length === 0 ? (
                /* ── Empty state ── */
                <div style={{ background: "#fff", borderRadius: 12, border: "2px dashed #E2E8F0", textAlign: "center", padding: "96px 24px" }}>
                    <div style={{ width: 56, height: 56, background: "#F8FAFC", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", border: "1px solid #F1F5F9" }}>
                        <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x={3} y={4} width={18} height={18} rx={2} /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: "#0F172A", marginBottom: 8 }}>{selectedQueue ? "No sessions found" : "No sessions yet"}</h3>
                    <p style={{ fontSize: 14, color: "#94A3B8", marginBottom: 32, maxWidth: 320, marginLeft: "auto", marginRight: "auto" }}>
                        {selectedQueue ? `No sessions recorded for ${selectedQueue}.` : "Create your first session to start organizing queues by date."}
                    </p>
                    {!isStaff && !selectedQueue && (
                        <button onClick={() => setShowCreate(true)} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "#2563EB", color: "#fff", fontWeight: 500, borderRadius: 8, border: "none", fontSize: 14, cursor: "pointer" }}>
                            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v16m8-8H4" /></svg>
                            Create First Session
                        </button>
                    )}
                </div>
            ) : (
                /* ── Timeline ── */
                <div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                        {grouped.map((group) => {
                            return (
                                <div key={group.label}>
                                    {/* ── Group header ── */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                                        <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.07em", color: "#94A3B8", textTransform: "uppercase" as const, whiteSpace: "nowrap" as const }}>{group.label}</span>
                                        <div style={{ flex: 1, height: 1, background: "#F1F5F9" }} />
                                        <span style={{ fontSize: 11, color: "#CBD5E1", whiteSpace: "nowrap" as const }}>{group.sessions.length} {group.sessions.length === 1 ? "session" : "sessions"}</span>
                                    </div>

                                    {/* ── Session cards ── */}
                                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                        {group.sessions.map((session) => {
                                            const today = isToday(session.session_date);
                                            const served = session.total_served ?? 0;
                                            return (
                                                <Link
                                                    key={session.id}
                                                    href={`${dashBase}/sessions/${session.id}/queues`}
                                                    className="bg-indigo-50/40 rounded-2xl border border-slate-100 shadow-sm ring-1 ring-slate-900/5 p-6 flex justify-between items-center w-full mb-4 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-950/5 hover:border-indigo-200/60 group cursor-pointer relative overflow-hidden"
                                                >
                                                    {/* Left Content */}
                                                    <div className="flex items-center gap-4 min-w-0">
                                                        {/* Absolute Left Edge Vertical Indicator Tab */}
                                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${today ? "bg-indigo-500" : "bg-slate-200"}`} />

                                                        {/* Date Badge */}
                                                        <div className="flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl w-[52px] h-[52px] shrink-0 shadow-md shadow-indigo-500/20">
                                                            <span className="text-[10px] font-bold text-indigo-200/90 uppercase tracking-widest">{getMonthShort(session.session_date)}</span>
                                                            <span className="text-[17px] font-extrabold text-white leading-none mt-1">{getDayNumber(session.session_date)}</span>
                                                        </div>

                                                        {/* Title + badge */}
                                                        <div className="flex flex-col gap-0.5 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-base font-bold text-slate-900 capitalize truncate">
                                                                    {session.title || (today ? "Today's Session" : formatShortDate(session.session_date))}
                                                                </span>
                                                                {today && (
                                                                    <span className="bg-sky-50 text-sky-700 border border-sky-200/60 font-bold px-2.5 py-0.5 rounded-full text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                                                                        LIVE
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-xs text-slate-400 font-normal">No notes provided</span>
                                                        </div>
                                                    </div>

                                                    {/* Right Content */}
                                                    <div className="flex items-center shrink-0">
                                                        {/* Unified Metrics Stream Row */}
                                                        <div className="flex items-center gap-4 bg-indigo-50/40 border border-indigo-100/60 rounded-xl px-4 py-2 text-slate-600 font-semibold text-xs mr-4">
                                                            {/* Queues */}
                                                            <span className="flex items-center gap-1.5">
                                                                <Layers className="w-4 h-4 text-indigo-600" strokeWidth={2} />
                                                                <span>{session.queue_count} {session.queue_count === 1 ? "Queue" : "Queues"}</span>
                                                            </span>
                                                            {/* Served */}
                                                            <span className="flex items-center gap-1.5">
                                                                <Users className="w-4 h-4 text-sky-500" strokeWidth={2} />
                                                                <span>{served} Served</span>
                                                            </span>
                                                        </div>

                                                        {/* Delete + Chevron */}
                                                        <div className="flex items-center gap-2">
                                                            {!isStaff && (
                                                                <button
                                                                    onClick={(e) => handleDelete(session.id, e)}
                                                                    disabled={deletingId === session.id}
                                                                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all duration-150"
                                                                    aria-label="Delete session"
                                                                >
                                                                    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                                                                </button>
                                                            )}
                                                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 transition-all group-hover:translate-x-1" />
                                                        </div>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Pagination */}
                    {total > LIMIT && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", marginTop: 24, borderTop: "1px solid #F1F5F9" }}>
                            <span style={{ fontSize: 13, fontWeight: 500, color: "#94A3B8" }}>
                                Showing <span style={{ fontWeight: 600, color: "#334155" }}>{(page - 1) * LIMIT + 1}</span> to <span style={{ fontWeight: 600, color: "#334155" }}>{Math.min(page * LIMIT, total)}</span> of <span style={{ fontWeight: 600, color: "#334155" }}>{total}</span>
                            </span>
                            <div style={{ display: "flex", gap: 8 }}>
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: "6px 16px", fontSize: 13, fontWeight: 500, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.5 : 1, color: "#64748B" }}>Previous</button>
                                <button onClick={() => setPage(p => p + 1)} disabled={page * LIMIT >= total} style={{ padding: "6px 16px", fontSize: 13, fontWeight: 500, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, cursor: page * LIMIT >= total ? "not-allowed" : "pointer", opacity: page * LIMIT >= total ? 0.5 : 1, color: "#64748B" }}>Next</button>
                            </div>
                        </div>
                    )}

                    {/* Pulse animation for LIVE dot */}
                    <style>{`
                        @keyframes pulse-dot {
                            0%, 100% { opacity: 1; transform: scale(1); }
                            50% { opacity: 0.4; transform: scale(0.75); }
                        }
                    `}</style>
                </div>
            )}

            {/* ── Create Session Modal ── */}
            {showCreate && (
                <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
                    <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.4)", backdropFilter: "blur(4px)" }} onClick={() => setShowCreate(false)} />
                    <div style={{ position: "relative", background: "#fff", borderRadius: 16, border: "1px solid #E2E8F0", maxWidth: 400, width: "100%", padding: 28 }}>
                        <div style={{ marginBottom: 24 }}>
                            <h3 style={{ fontSize: 18, fontWeight: 600, color: "#0F172A", letterSpacing: "-0.02em", margin: 0, marginBottom: 4 }}>New Session</h3>
                            <p style={{ fontSize: 13, color: "#94A3B8", margin: 0 }}>Select a date and optional title for the new session.</p>
                        </div>
                        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            <div>
                                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 8 }}>
                                    Session Date <span style={{ color: "#EF4444" }}>*</span>
                                </label>
                                <input
                                    ref={dateRef}
                                    type="date"
                                    value={newDate}
                                    onChange={(e) => setNewDate(e.target.value)}
                                    required
                                    style={{ width: "100%", borderRadius: 8, border: "1px solid #E2E8F0", padding: "10px 14px", fontSize: 14, color: "#0F172A", fontWeight: 500, background: "#F8FAFC", outline: "none", boxSizing: "border-box" }}
                                />
                            </div>
                            <div>
                                <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 8 }}>
                                    <span>Title</span>
                                    <span style={{ fontWeight: 400, textTransform: "none" as const, letterSpacing: "normal" }}>Optional</span>
                                </label>
                                <input
                                    type="text"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="e.g. Morning Clinic"
                                    maxLength={200}
                                    style={{ width: "100%", borderRadius: 8, border: "1px solid #E2E8F0", padding: "10px 14px", fontSize: 14, color: "#0F172A", fontWeight: 500, background: "#F8FAFC", outline: "none", boxSizing: "border-box" }}
                                />
                            </div>
                            {createError && (
                                <div style={{ padding: 12, borderRadius: 8, background: "#FEF2F2", color: "#B91C1C", fontSize: 13, fontWeight: 500, border: "1px solid #FECACA", display: "flex", alignItems: "flex-start", gap: 8 }}>
                                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx={12} cy={12} r={10} /><path d="M12 8v4m0 4h.01" /></svg>
                                    <span>{createError}</span>
                                </div>
                            )}
                            <div style={{ display: "flex", gap: 8, paddingTop: 16, marginTop: 4, borderTop: "1px solid #F1F5F9" }}>
                                <button type="button" onClick={() => setShowCreate(false)} style={{ flex: 1, padding: "10px 16px", fontSize: 13, fontWeight: 500, color: "#64748B", background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, cursor: "pointer" }}>Cancel</button>
                                <button type="submit" disabled={createLoading || !newDate} style={{ flex: 1.5, padding: "10px 16px", fontSize: 13, fontWeight: 500, color: "#fff", background: "#2563EB", border: "none", borderRadius: 8, cursor: createLoading || !newDate ? "not-allowed" : "pointer", opacity: createLoading || !newDate ? 0.5 : 1 }}>
                                    {createLoading ? "Creating..." : "Create Session"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
