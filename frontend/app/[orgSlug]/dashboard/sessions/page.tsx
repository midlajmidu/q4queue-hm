"use client";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { SessionResponse } from "@/types/api";
import { useAuth } from "@/hooks/useAuth";
import { StandardPageHeader } from "@/components/StandardPageHeader";

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

    const grouped = useMemo(() => groupByTimeline(sessions), [sessions]);

    const labelMeta: Record<TimelineLabel, { color: string; dotColor: string; icon: string }> = {
        Today:     { color: "text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-900/50", dotColor: "bg-indigo-500", icon: "⚡" },
        Tomorrow:  { color: "text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 border-sky-200 dark:border-sky-900/50",         dotColor: "bg-sky-400",    icon: "📅" },
        Yesterday: { color: "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-900/50",   dotColor: "bg-amber-400",  icon: "↩" },
        "This Week": { color: "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-900/50", dotColor: "bg-emerald-400", icon: "📆" },
        Earlier:   { color: "text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700",    dotColor: "bg-slate-300",  icon: "🗂" },
    };

    return (
        <div>
            {/* ── Header ── */}
            <StandardPageHeader
                breadcrumbs={[
                    { label: "Organization", href: dashBase },
                    { label: "Sessions" }
                ]}
                title="Sessions"
                subtitle="Your service timeline — organized by date."
                action={
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-[var(--q-card-bg-alt)] border border-[var(--q-borderLight)] rounded-xl px-3 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 transition-all">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            <input
                                type="date"
                                value={filterDate}
                                max={toLocalDateStr()}
                                onChange={(e) => { setFilterDate(e.target.value); setPage(1); }}
                                className="text-[13px] font-medium text-[var(--q-text)] focus:outline-none bg-transparent appearance-none"
                            />
                            {filterDate && (
                                <button onClick={() => { setFilterDate(""); setPage(1); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                </button>
                            )}
                        </div>
                        {!isStaff && (
                            <button
                                onClick={() => setShowCreate(true)}
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-b from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold rounded-xl transition-all shadow-[0_1px_3px_rgba(99,102,241,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] text-[13px]"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                                New Session
                            </button>
                        )}
                    </div>
                }
            />

            {/* ── Error ── */}
            {error && (
                <div role="alert" className="mb-6 bg-red-50 text-red-700 px-5 py-4 rounded-xl border border-red-200 text-[13px] font-medium flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={loadData} className="underline font-semibold hover:text-red-800 transition-colors">Retry</button>
                </div>
            )}

            {/* ── Loading ── */}
            {isLoading ? (
                <div className="text-center py-24">
                    <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-[13px] text-[#64748b] font-medium">Loading sessions...</p>
                </div>
            ) : sessions.length === 0 ? (
                /* ── Empty state ── */
                <div className="bg-[var(--q-card-bg)] rounded-2xl border-2 border-dashed border-[var(--q-borderLight)] text-center py-24 px-6">
                    <div className="w-16 h-16 bg-[var(--q-slate-bg)] rounded-2xl flex items-center justify-center mx-auto mb-5 border border-[var(--q-borderLight)]">
                        <svg className="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <h3 className="text-[17px] font-bold text-[#0f172a] mb-2">No sessions yet</h3>
                    <p className="text-[14px] text-[#64748b] mb-8 max-w-sm mx-auto">Create your first session to start organizing queues by date.</p>
                    {!isStaff && (
                        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-b from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold rounded-xl transition-all shadow-[0_1px_3px_rgba(99,102,241,0.3)] text-[14px]">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                            Create First Session
                        </button>
                    )}
                </div>
            ) : (
                /* ── Timeline ── */
                <div className="relative">
                    {/* Vertical timeline line */}
                    <div className="absolute left-[23px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-indigo-200 via-slate-200 to-transparent hidden sm:block" aria-hidden />

                    <div className="space-y-8">
                        {grouped.map((group) => {
                            const meta = labelMeta[group.label];
                            return (
                                <div key={group.label}>
                                    {/* ── Group header ── */}
                                    <div className="flex items-center gap-3 mb-4 relative">
                                        <div className={`w-[48px] h-[48px] rounded-2xl flex items-center justify-center text-lg flex-shrink-0 border ${meta.color} shadow-sm relative z-10`}>
                                            {meta.icon}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-[18px] font-bold text-slate-900 dark:text-white tracking-tight">{group.label}</h2>
                                            <span className="tabular-nums text-[12px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{group.sessions.length}</span>
                                        </div>
                                    </div>

                                    {/* ── Session cards ── */}
                                    <div className="sm:ml-[23px] sm:pl-8 sm:border-l-0 space-y-3">
                                        {group.sessions.map((session) => {
                                            const today = isToday(session.session_date);
                                            return (
                                                <Link
                                                    key={session.id}
                                                    href={`${dashBase}/sessions/${session.id}/queues`}
                                                    className={`group flex items-center gap-4 bg-[var(--q-card-bg)] rounded-2xl border p-4 sm:p-5 transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] ${today ? "border-indigo-500/30 ring-1 ring-indigo-500/20" : "border-[var(--q-borderLight)]"}`}
                                                >
                                                    {/* Date pill */}
                                                    <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${today ? "bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "bg-[var(--q-slate-bg)] text-[var(--q-text-muted)] border border-[var(--q-borderLight)]"}`}>
                                                        <span className={`text-[10px] font-bold uppercase leading-none ${today ? "text-indigo-100" : "text-[var(--q-text-muted)]"}`}>{getMonthShort(session.session_date)}</span>
                                                        <span className="tabular-nums text-[20px] font-extrabold leading-tight">{getDayNumber(session.session_date)}</span>
                                                    </div>

                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <p className="text-[15px] font-bold text-[var(--q-text)] tracking-tight truncate">
                                                                {today ? "Today's Session" : formatShortDate(session.session_date)}
                                                            </p>
                                                            {today && (
                                                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-white bg-indigo-500 px-1.5 py-0.5 rounded-md shadow-sm">
                                                                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                                                    LIVE
                                                                </span>
                                                            )}
                                                        </div>
                                                        {session.title && (
                                                            <p className="text-[12.5px] text-[var(--q-text-muted)] truncate max-w-[200px]">{session.title}</p>
                                                        )}
                                                        <div className="flex items-center gap-3 mt-1.5">
                                                            <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-500">
                                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                                                {session.queue_count} {session.queue_count === 1 ? "queue" : "queues"}
                                                            </span>
                                                            <span className="text-[11px] text-slate-300">•</span>
                                                            <span className="text-[11.5px] text-slate-400 font-medium">{formatFullDate(session.session_date)}</span>
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        {!isStaff && (
                                                            <button
                                                                onClick={(e) => handleDelete(session.id, e)}
                                                                disabled={deletingId === session.id}
                                                                className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 disabled:opacity-30"
                                                                aria-label="Delete session"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                            </button>
                                                        )}
                                                        <div className="text-slate-300 group-hover:text-indigo-400 transition-colors">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
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
                        <div className="flex items-center justify-between bg-[var(--q-card-bg)] px-6 py-4 rounded-2xl border border-[var(--q-borderLight)] shadow-sm mt-8">
                            <span className="text-[13px] font-medium text-[var(--q-text-muted)]">
                                Showing <span className="font-bold text-[var(--q-text)]">{(page - 1) * LIMIT + 1}</span> to <span className="font-bold text-[var(--q-text)]">{Math.min(page * LIMIT, total)}</span> of <span className="font-bold text-[var(--q-text)]">{total}</span>
                            </span>
                            <div className="flex gap-2">
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 text-[13px] font-semibold bg-transparent border border-[var(--q-borderLight)] rounded-xl shadow-sm disabled:opacity-50 hover:bg-[var(--q-card-bg-alt)] transition-all text-[var(--q-text-muted)]">Previous</button>
                                <button onClick={() => setPage(p => p + 1)} disabled={page * LIMIT >= total} className="px-4 py-2 text-[13px] font-semibold bg-transparent border border-[var(--q-borderLight)] rounded-xl shadow-sm disabled:opacity-50 hover:bg-[var(--q-card-bg-alt)] transition-all text-[var(--q-text-muted)]">Next</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Create Session Modal ── */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
                    <div className="relative bg-white rounded-[20px] shadow-[0_20px_40px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.02)] max-w-[400px] w-full p-7">
                        <div className="mb-6">
                            <h3 className="text-[20px] font-extrabold text-[#0f172a] tracking-tight mb-1.5">New Session</h3>
                            <p className="text-[13.5px] text-[#64748b]">Select a date and optional title for the new session.</p>
                        </div>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-[10.5px] font-bold text-[#64748b] uppercase tracking-[0.08em] mb-2">
                                    Session Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    ref={dateRef}
                                    type="date"
                                    value={newDate}
                                    onChange={(e) => setNewDate(e.target.value)}
                                    required
                                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[14px] text-[#0f172a] font-medium bg-[#fafbfe] hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 focus:outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[10.5px] font-bold text-[#64748b] uppercase tracking-[0.08em] mb-2 flex items-center justify-between">
                                    <span>Title</span>
                                    <span className="text-slate-400 font-medium tracking-normal normal-case">Optional</span>
                                </label>
                                <input
                                    type="text"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="e.g. Morning Clinic"
                                    maxLength={200}
                                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[14px] text-[#0f172a] font-medium bg-[#fafbfe] hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 focus:outline-none transition-all placeholder:text-slate-400/80"
                                />
                            </div>
                            {createError && (
                                <div className="p-3 rounded-xl bg-red-50 text-red-700 text-[13px] font-medium border border-red-100 flex items-start gap-2">
                                    <svg className="w-[18px] h-[18px] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <span>{createError}</span>
                                </div>
                            )}
                            <div className="flex gap-3 pt-5 mt-2 border-t border-slate-100">
                                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2.5 text-[13.5px] font-semibold text-[#64748b] bg-white border border-slate-200 hover:bg-slate-50 hover:text-[#0f172a] rounded-xl transition-all">Cancel</button>
                                <button type="submit" disabled={createLoading || !newDate} className="flex-[1.5] px-4 py-2.5 text-[13.5px] font-semibold text-white bg-gradient-to-b from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 rounded-xl disabled:opacity-50 transition-all shadow-[0_1px_3px_rgba(99,102,241,0.3)]">
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
