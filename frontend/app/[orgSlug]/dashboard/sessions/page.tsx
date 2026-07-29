"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useDashBase } from "@/hooks/useDashBase";
import { useBranchTimezone } from "@/context/BranchTimezoneContext";
import { api, ApiError } from "@/lib/api";
import { SessionResponse } from "@/types/api";

import { Plus, ChevronRight, Edit2, Layers, Users, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

// ─── Date & Timezone Helpers ──────────────────────────────────────

function toLocalDateStr(tz: string): string {
    try {
        const d = new Date();
        const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
        return formatter.format(d);
    } catch {
        return new Date().toISOString().slice(0, 10);
    }
}

function formatShortDate(dateStr: string, tz: string): string {
    if (!dateStr) return "";
    try {
        const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
        const date = new Date(Date.UTC(y, m - 1, d));
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
    } catch {
        return dateStr;
    }
}

function isToday(dateStr: string, tz: string): boolean {
    return dateStr.slice(0, 10) === toLocalDateStr(tz);
}

function getMonthShort(dateStr: string, tz: string): string {
    if (!dateStr) return "";
    try {
        const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
        const date = new Date(Date.UTC(y, m - 1, d));
        return date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
    } catch {
        return "DEC";
    }
}

function getDayNumber(dateStr: string, tz: string): string {
    if (!dateStr) return "";
    const parts = dateStr.slice(0, 10).split("-");
    return parts[2] ? parts[2].padStart(2, "0") : "01";
}

// ─── Timeline Grouping Helpers ────────────────────────────────────

type TimelineLabel = "Tomorrow" | "Today" | "Yesterday" | "This Week" | "Earlier";

function getTimelineGroup(sessionDateStr: string, tz: string): TimelineLabel {
    const sessionDayStr = sessionDateStr.slice(0, 10);
    const todayStr = toLocalDateStr(tz);

    const [ty, tm, td] = todayStr.split("-").map(Number);
    const todayUtc = new Date(Date.UTC(ty, tm - 1, td));

    const tomUtc = new Date(todayUtc);
    tomUtc.setUTCDate(tomUtc.getUTCDate() + 1);
    const tomStr = tomUtc.toISOString().slice(0, 10);

    const yestUtc = new Date(todayUtc);
    yestUtc.setUTCDate(yestUtc.getUTCDate() - 1);
    const yestStr = yestUtc.toISOString().slice(0, 10);

    const dow = todayUtc.getUTCDay();
    const daysSinceMonday = (dow + 6) % 7;
    const mondayUtc = new Date(todayUtc);
    mondayUtc.setUTCDate(mondayUtc.getUTCDate() - daysSinceMonday);
    const mondayStr = mondayUtc.toISOString().slice(0, 10);

    if (sessionDayStr === tomStr) return "Tomorrow";
    if (sessionDayStr === todayStr) return "Today";
    if (sessionDayStr === yestStr) return "Yesterday";
    if (sessionDayStr >= mondayStr && sessionDayStr <= todayStr) return "This Week";
    return "Earlier";
}

interface GroupedSessions { label: TimelineLabel; sessions: SessionResponse[] }

function groupByTimeline(sessions: SessionResponse[], tz: string): GroupedSessions[] {
    const order: TimelineLabel[] = ["Tomorrow", "Today", "Yesterday", "This Week", "Earlier"];
    const map = new Map<TimelineLabel, SessionResponse[]>();
    for (const s of sessions) {
        const label = getTimelineGroup(s.session_date, tz);
        if (!map.has(label)) map.set(label, []);
        map.get(label)!.push(s);
    }
    return order.filter(l => map.has(l)).map(l => ({ label: l, sessions: map.get(l)! }));
}

function getPageNumbers(currentPage: number, totalPages: number) {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        pages.push(1);
        if (currentPage > 3) pages.push("...");
        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);
        for (let i = start; i <= end; i++) pages.push(i);
        if (currentPage < totalPages - 2) pages.push("...");
        pages.push(totalPages);
    }
    return pages;
}

// ─── Component ───────────────────────────────────────────────────

export default function SessionsPage() {
    const tz = useBranchTimezone();
    const { user, isReadOnly, isImpersonating } = useAuth();
    const dashBase = useDashBase();
    const router = useRouter();
    const searchParams = useSearchParams();
    const isStaff = user?.role === "staff";
    const isGlobalOrOrgAdmin = user?.role === "super_admin" || user?.role === "organization_admin" || isImpersonating;
    const canCreateSession = !isGlobalOrOrgAdmin && !isReadOnly;
    const canDeleteSession = isGlobalOrOrgAdmin;
    const canEditSession = isGlobalOrOrgAdmin || (!isStaff && !isReadOnly);

    const [showEarlier, setShowEarlier] = useState(false);
    const [sessions, setSessions] = useState<SessionResponse[]>([]);
    const [queueList, setQueueList] = useState<string[]>([]);
    const [selectedQueue, setSelectedQueue] = useState<string>("");
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const limit = 10; // 10 cards per page for earlier view as requested
    const [filterDate, setFilterDate] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const totalPages = Math.ceil(total / limit) || 1;

    // Create modal
    const [showCreate, setShowCreate] = useState(false);
    const [newDate, setNewDate] = useState(() => toLocalDateStr(tz));
    const [newTitle, setNewTitle] = useState("");
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const dateRef = useRef<HTMLInputElement>(null);

    // Delete
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [sessionToDelete, setSessionToDelete] = useState<SessionResponse | null>(null);

    // Edit
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingSession, setEditingSession] = useState<SessionResponse | null>(null);
    const [editSessionTitle, setEditSessionTitle] = useState("");
    const [editLoading, setEditLoading] = useState(false);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            if (!showEarlier) {
                // Fetch recent timeline sessions
                const res = await api.listSessions(100, 0, filterDate || undefined);
                setSessions(res.items || []);
                setTotal(res.total);
            } else {
                // Fetch paginated earlier sessions (10 cards per page)
                const res = await api.listSessions(limit, (page - 1) * limit, filterDate || undefined);
                setSessions(res.items || []);
                setTotal(res.total);
            }
        } catch (err: unknown) {
            if (err instanceof Error) setError(err.message);
            else setError("Failed to load sessions");
        } finally {
            setIsLoading(false);
        }
    }, [page, limit, filterDate, showEarlier]);

    useEffect(() => { loadData(); }, [loadData]);

    useEffect(() => {
        const action = searchParams.get("action");
        if (action === "create") {
            setShowCreate(true);
        }
    }, [searchParams]);

    // Fetch unique queue names for the dropdown
    useEffect(() => {
        api.listQueues().then(queues => {
            const unique = Array.from(new Set(queues.map(q => q.name))).sort();
            setQueueList(unique);
        }).catch(() => { });
    }, []);

    useEffect(() => {
        if (searchParams.get("alert") === "no_session") {
            setShowCreate(true);
            router.replace(`${dashBase}/sessions`);
        }
    }, [searchParams, isStaff, user, router, dashBase]);

    useEffect(() => {
        if (showCreate) {
            setNewDate(toLocalDateStr(tz));
            setNewTitle("");
            setCreateError(null);
            setTimeout(() => dateRef.current?.focus(), 100);
        }
    }, [showCreate, tz]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDate) {
            setCreateError("Please select a session date.");
            return;
        }
        if (newDate > toLocalDateStr(tz)) {
            setCreateError("Future dates are not allowed. Please select today or a past date.");
            return;
        }
        setCreateLoading(true);
        setCreateError(null);
        try {
            const created = await api.createSession({ session_date: newDate, title: newTitle.trim() || undefined });
            setShowCreate(false);

            const titleText = newTitle.trim() ? `"${newTitle.trim()}"` : `for ${formatShortDate(newDate, tz)}`;

            toast.custom((t) => (
                <div className="pointer-events-auto w-[356px] overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-black/5">
                    <div className="p-4">
                        <div className="flex items-start">
                            <div className="shrink-0">
                                <CheckCircle2 className="h-6 w-6 text-emerald-500" aria-hidden="true" />
                            </div>
                            <div className="ml-3 w-0 flex-1 pt-0.5">
                                <p className="text-sm font-semibold text-slate-900">Session Created</p>
                                <p className="mt-1 text-sm text-slate-500">
                                    New session {titleText} has been created successfully.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ), { duration: 4000 });

            await loadData();
            router.push(`${dashBase}/sessions/${created.id}/queues`);
        } catch (err: unknown) {
            setCreateError(err instanceof ApiError ? err.message : "Failed to create session");
        } finally {
            setCreateLoading(false);
        }
    };

    const handleDelete = (session: SessionResponse, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setSessionToDelete(session);
    };

    const handleDeleteConfirm = async () => {
        if (!sessionToDelete) return;
        setDeletingId(sessionToDelete.id);
        try {
            await api.deleteSession(sessionToDelete.id);
            toast.success("Session deleted successfully");
            setSessionToDelete(null);
            await loadData();
        } catch (err: unknown) {
            toast.error(err instanceof ApiError ? err.message : "Failed to delete session");
        } finally {
            setDeletingId(null);
        }
    };

    const handleEditClick = (session: SessionResponse, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setEditingSession(session);
        setEditSessionTitle(session.title || "");
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSession) return;
        setEditLoading(true);
        try {
            await api.updateSession(editingSession.id, { title: editSessionTitle });
            toast.success("Session updated successfully");
            setIsEditModalOpen(false);
            setEditingSession(null);
            await loadData();
        } catch (err: unknown) {
            toast.error(err instanceof ApiError ? err.message : "Failed to update session");
        } finally {
            setEditLoading(false);
        }
    };

    const filteredSessions = useMemo(() => {
        if (!selectedQueue) return sessions;
        return sessions.filter(session =>
            session.queue_names?.includes(selectedQueue)
        );
    }, [sessions, selectedQueue]);

    const grouped = useMemo(() => groupByTimeline(filteredSessions, tz), [filteredSessions, tz]);

    // Separate main timeline groups (Tomorrow, Today, Yesterday, This Week) from Earlier
    const recentGroups = useMemo(() => {
        return grouped.filter(g => g.label !== "Earlier");
    }, [grouped]);

    const earlierGroup = useMemo(() => {
        return grouped.find(g => g.label === "Earlier");
    }, [grouped]);

    const earlierCount = earlierGroup?.sessions.length || Math.max(0, total - recentGroups.reduce((acc, g) => acc + g.sessions.length, 0));

    return (
        <div>
            {/* ── Page Header ── */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
                <div>
                    {showEarlier ? (
                        <button
                            onClick={() => { setShowEarlier(false); setPage(1); }}
                            className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline mb-2 transition-all cursor-pointer"
                        >
                            <span>← Back to Recent Sessions</span>
                        </button>
                    ) : (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500 mb-2 tracking-wide uppercase">
                            <Link href={dashBase} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Organization</Link>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" strokeWidth={3} />
                            <span className="text-slate-600 dark:text-slate-300">Sessions</span>
                        </div>
                    )}
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight m-0">Sessions</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Monitor and manage your daily queue operations.</p>

                </div>
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full sm:w-auto">
                    <div className="flex gap-2 w-full sm:w-auto">
                        {/* Queue filter */}
                        <div className="relative flex-1 sm:flex-initial">
                            <select
                                value={selectedQueue}
                                onChange={(e) => setSelectedQueue(e.target.value)}
                                className="w-full h-10 pl-3 pr-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm rounded-xl text-sm text-slate-700 dark:text-slate-200 font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer transition-all"
                            >
                                <option value="" className="dark:bg-slate-900">All Queues</option>
                                {queueList.map(name => (
                                    <option key={name} value={name} className="dark:bg-slate-900">{name}</option>
                                ))}
                            </select>
                            <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none w-4 h-4 text-slate-400 dark:text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                        </div>
                        {/* Date filter */}
                        <div className="flex-1 sm:flex-initial flex items-center gap-2 h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm rounded-xl px-3 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                            <svg className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x={3} y={4} width={18} height={18} rx={2} /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                            <input
                                type="date"
                                value={filterDate}
                                max={toLocalDateStr(tz)}
                                onChange={(e) => { setFilterDate(e.target.value); setPage(1); }}
                                className="bg-transparent border-none outline-none text-sm text-slate-700 dark:text-slate-200 font-medium w-full dark:scheme-dark"
                            />
                            {filterDate && (
                                <button onClick={() => { setFilterDate(""); setPage(1); }} className="p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shrink-0">
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                                </button>
                            )}
                        </div>
                    </div>
                    {/* Create */}
                    {canCreateSession && (
                        <button
                            onClick={() => setShowCreate(true)}
                            className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 shadow-md shadow-indigo-500/20 text-white font-semibold text-sm rounded-xl h-10 px-5 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] flex items-center justify-center gap-2 w-full sm:w-auto"
                        >
                            <Plus className="w-4 h-4" strokeWidth={2.5} />
                            <span>New Session</span>
                        </button>
                    )}
                </div>
            </div>

            {/* ── Error ── */}
            {error && (
                <div role="alert" className="mb-6 bg-red-50 text-red-700 px-4 py-3 rounded-xl border border-red-200 text-sm font-medium flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span>{error}</span>
                    </div>
                    <button onClick={loadData} className="text-red-700 hover:text-red-800 font-bold underline decoration-red-300 hover:decoration-red-700 transition-colors">Retry</button>
                </div>
            )}

            {/* ── Loading ── */}
            {isLoading ? (
                <div className="text-center py-24">
                    <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4 shadow-sm" />
                    <p className="text-sm text-slate-500 font-medium">Loading your timeline...</p>
                </div>
            ) : filteredSessions.length === 0 ? (
                /* ── Empty state ── */
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm text-center py-24 px-6 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-5 border border-slate-100 shadow-sm ring-1 ring-slate-900/5">
                        <svg className="w-8 h-8 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><rect x={3} y={4} width={18} height={18} rx={2} /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{selectedQueue ? "No sessions found" : "Your timeline is empty"}</h3>
                    <p className="text-sm text-slate-500 mb-8 max-w-sm mx-auto leading-relaxed">
                        {selectedQueue ? `No sessions recorded for ${selectedQueue}. Try adjusting your filters.` : "Create your first session to start organizing your queues and tracking performance by date."}
                    </p>
                    {!selectedQueue && (
                        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all duration-200 hover:-translate-y-0.5 shadow-md shadow-indigo-500/20 active:translate-y-0">
                            <Plus className="w-4 h-4" strokeWidth={2.5} />
                            Create First Session
                        </button>
                    )}
                </div>
            ) : (
                /* ── Timeline Display ── */
                <div>
                    {!showEarlier ? (
                        /* Main Mode: TODAY, YESTERDAY, THIS WEEK + Minimal Earlier Button Box */
                        <div className="flex flex-col gap-8">
                            {recentGroups.map((group) => (
                                <div key={group.label} className="relative">
                                    {/* ── Group Header ── */}
                                    <div className="flex items-center gap-4 mb-4 pt-4 pb-2">
                                        <div className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm rounded-lg">
                                            <span className="text-[11px] font-extrabold tracking-widest text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap">{group.label}</span>
                                        </div>
                                        <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
                                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">{group.sessions.length} {group.sessions.length === 1 ? "SESSION" : "SESSIONS"}</span>
                                    </div>

                                    {/* ── Session Cards ── */}
                                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                        {group.sessions.map((session) => {
                                            const today = isToday(session.session_date, tz);
                                            const served = session.total_served ?? 0;
                                            return (
                                                <Link
                                                    key={session.id}
                                                    href={`${dashBase}/sessions/${session.id}/queues`}
                                                    className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl rounded-xl border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md hover:border-blue-100 dark:hover:border-indigo-500/30 p-4 sm:p-5 flex flex-col sm:flex-row sm:justify-between sm:items-center w-full transition-all duration-300 group cursor-pointer relative overflow-hidden"
                                                >
                                                    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl z-0">
                                                        <svg className="absolute right-0 bottom-0 w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M0,70 C40,50 80,90 120,70 C160,50 200,90 240,70 C280,50 320,90 360,70 C380,62 390,60 400,60 L400,100 L0,100 Z" fill="#1e40af" fillOpacity="0.06" />
                                                            <path d="M0,80 C50,62 100,95 150,78 C200,60 250,95 300,78 C340,65 370,68 400,65 L400,100 L0,100 Z" fill="#3b82f6" fillOpacity="0.05" />
                                                            <path d="M0,88 C60,74 120,98 180,85 C240,72 300,98 360,85 C380,80 390,80 400,78 L400,100 L0,100 Z" fill="#93c5fd" fillOpacity="0.06" />
                                                        </svg>
                                                    </div>

                                                    <div className="flex items-center gap-4 sm:gap-5 min-w-0 w-full sm:w-auto relative z-10">
                                                        <div className="flex flex-col items-center justify-center bg-gradient-to-b from-indigo-500 to-indigo-700 rounded-lg w-[54px] h-[58px] shrink-0 shadow-sm shadow-indigo-500/30">
                                                            <span className="text-[10px] font-semibold text-indigo-200 uppercase tracking-widest leading-none mt-1">{getMonthShort(session.session_date, tz)}</span>
                                                            <span className="text-[20px] font-bold text-white leading-none mt-1">{getDayNumber(session.session_date, tz)}</span>
                                                        </div>

                                                        <div className="flex flex-col gap-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-base font-semibold text-slate-900 dark:text-white capitalize truncate">
                                                                    {session.title || (today ? "Today's Session" : formatShortDate(session.session_date, tz))}
                                                                </span>
                                                                {today && (
                                                                    <span className="relative flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50 font-bold px-2 py-0.5 rounded-md text-[10px] uppercase tracking-widest shrink-0">
                                                                        <span className="relative flex h-2 w-2">
                                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                                                        </span>
                                                                        LIVE
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto mt-4 sm:mt-0 pt-3 sm:pt-0 border-t border-slate-100 dark:border-white/5 sm:border-0 shrink-0 relative z-10 flex-wrap sm:flex-nowrap">
                                                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-white/5 rounded-lg px-3 py-1.5 text-slate-600 dark:text-slate-300 font-semibold text-xs transition-colors group-hover:bg-white dark:group-hover:bg-slate-800 group-hover:border-slate-200 dark:group-hover:border-white/10">
                                                                <Layers className="w-3.5 h-3.5 text-blue-500" strokeWidth={2.5} />
                                                                <span>{session.queue_count} <span className="font-medium text-slate-400 dark:text-slate-500">Queues</span></span>
                                                            </div>
                                                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-white/5 rounded-lg px-3 py-1.5 text-slate-600 dark:text-slate-300 font-semibold text-xs transition-colors group-hover:bg-white dark:group-hover:bg-slate-800 group-hover:border-slate-200 dark:group-hover:border-white/10">
                                                                <Users className="w-3.5 h-3.5 text-sky-500" strokeWidth={2.5} />
                                                                <span>{served} <span className="font-medium text-slate-400 dark:text-slate-500">Served</span></span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-1 shrink-0 ml-1">
                                                            {canEditSession && (
                                                                <button
                                                                    onClick={(e) => handleEditClick(session, e)}
                                                                    className="opacity-100 sm:opacity-0 group-hover:opacity-100 p-2 rounded-lg text-slate-300 dark:text-slate-600 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-all duration-200"
                                                                    aria-label="Edit session"
                                                                >
                                                                    <Edit2 className="w-[18px] h-[18px]" strokeWidth={2} />
                                                                </button>
                                                            )}
                                                            {canDeleteSession && (
                                                                <button
                                                                    onClick={(e) => handleDelete(session, e)}
                                                                    disabled={deletingId === session.id}
                                                                    className="opacity-100 sm:opacity-0 group-hover:opacity-100 p-2 rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all duration-200"
                                                                    aria-label="Delete session"
                                                                >
                                                                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                                                                </button>
                                                            )}
                                                            <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-blue-600 dark:group-hover:text-indigo-400 transition-colors duration-300 group-hover:translate-x-1" strokeWidth={2.5} />
                                                        </div>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                            {/* ── Minimalist "Earlier" Arrow Button Box at Bottom ── */}
                            <div className="flex items-center justify-between py-4 mt-4 border-t border-slate-200 dark:border-white/10">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-extrabold tracking-widest text-slate-500 dark:text-slate-400 uppercase">EARLIER</span>
                                    {earlierCount > 0 && (
                                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                            ({earlierCount} {earlierCount === 1 ? "SESSION" : "SESSIONS"})
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => { setShowEarlier(true); setPage(1); }}
                                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-xs text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-indigo-300 transition-all cursor-pointer group"
                                >
                                    <span>View Earlier</span>
                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Earlier Mode: Image 2 View (EARLIER Header line + 10 Cards + Real Pagination) */
                        <div>
                            {/* Exact EARLIER Header line matching Image 2 */}
                            <div className="flex items-center gap-4 mb-6 pt-2">
                                <div className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm rounded-lg">
                                    <span className="text-[11px] font-extrabold tracking-widest text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap">EARLIER</span>
                                </div>
                                <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
                                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">
                                    {total} {total === 1 ? "SESSION" : "SESSIONS"}
                                </span>
                            </div>

                            {/* Session Cards for Earlier Page */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {filteredSessions.map((session) => {
                                    const today = isToday(session.session_date, tz);
                                    const served = session.total_served ?? 0;
                                    return (
                                        <Link
                                            key={session.id}
                                            href={`${dashBase}/sessions/${session.id}/queues`}
                                            className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl rounded-xl border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md hover:border-blue-100 dark:hover:border-indigo-500/30 p-4 sm:p-5 flex flex-col sm:flex-row sm:justify-between sm:items-center w-full transition-all duration-300 group cursor-pointer relative overflow-hidden"
                                        >
                                            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl z-0">
                                                <svg className="absolute right-0 bottom-0 w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M0,70 C40,50 80,90 120,70 C160,50 200,90 240,70 C280,50 320,90 360,70 C380,62 390,60 400,60 L400,100 L0,100 Z" fill="#1e40af" fillOpacity="0.06" />
                                                    <path d="M0,80 C50,62 100,95 150,78 C200,60 250,95 300,78 C340,65 370,68 400,65 L400,100 L0,100 Z" fill="#3b82f6" fillOpacity="0.05" />
                                                    <path d="M0,88 C60,74 120,98 180,85 C240,72 300,98 360,85 C380,80 390,80 400,78 L400,100 L0,100 Z" fill="#93c5fd" fillOpacity="0.06" />
                                                </svg>
                                            </div>

                                            <div className="flex items-center gap-4 sm:gap-5 min-w-0 w-full sm:w-auto relative z-10">
                                                <div className="flex flex-col items-center justify-center bg-gradient-to-b from-indigo-500 to-indigo-700 rounded-lg w-[54px] h-[58px] shrink-0 shadow-sm shadow-indigo-500/30">
                                                    <span className="text-[10px] font-semibold text-indigo-200 uppercase tracking-widest leading-none mt-1">{getMonthShort(session.session_date, tz)}</span>
                                                    <span className="text-[20px] font-bold text-white leading-none mt-1">{getDayNumber(session.session_date, tz)}</span>
                                                </div>

                                                <div className="flex flex-col gap-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-base font-semibold text-slate-900 dark:text-white capitalize truncate">
                                                            {session.title || formatShortDate(session.session_date, tz)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto mt-4 sm:mt-0 pt-3 sm:pt-0 border-t border-slate-100 dark:border-white/5 sm:border-0 shrink-0 relative z-10 flex-wrap sm:flex-nowrap">
                                                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-white/5 rounded-lg px-3 py-1.5 text-slate-600 dark:text-slate-300 font-semibold text-xs transition-colors group-hover:bg-white dark:group-hover:bg-slate-800 group-hover:border-slate-200 dark:group-hover:border-white/10">
                                                        <Layers className="w-3.5 h-3.5 text-blue-500" strokeWidth={2.5} />
                                                        <span>{session.queue_count} <span className="font-medium text-slate-400 dark:text-slate-500">Queues</span></span>
                                                    </div>
                                                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-white/5 rounded-lg px-3 py-1.5 text-slate-600 dark:text-slate-300 font-semibold text-xs transition-colors group-hover:bg-white dark:group-hover:bg-slate-800 group-hover:border-slate-200 dark:group-hover:border-white/10">
                                                        <Users className="w-3.5 h-3.5 text-sky-500" strokeWidth={2.5} />
                                                        <span>{served} <span className="font-medium text-slate-400 dark:text-slate-500">Served</span></span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1 shrink-0 ml-1">
                                                    {canEditSession && (
                                                        <button
                                                            onClick={(e) => handleEditClick(session, e)}
                                                            className="opacity-100 sm:opacity-0 group-hover:opacity-100 p-2 rounded-lg text-slate-300 dark:text-slate-600 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-all duration-200"
                                                            aria-label="Edit session"
                                                        >
                                                            <Edit2 className="w-[18px] h-[18px]" strokeWidth={2} />
                                                        </button>
                                                    )}
                                                    {canDeleteSession && (
                                                        <button
                                                            onClick={(e) => handleDelete(session, e)}
                                                            disabled={deletingId === session.id}
                                                            className="opacity-100 sm:opacity-0 group-hover:opacity-100 p-2 rounded-lg text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all duration-200"
                                                            aria-label="Delete session"
                                                        >
                                                            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                                                        </button>
                                                    )}
                                                    <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-blue-600 dark:group-hover:text-indigo-400 transition-colors duration-300 group-hover:translate-x-1" strokeWidth={2.5} />
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>

                            {/* Pagination Bar for Earlier Archive (10 cards at a time) */}
                            {total > limit && (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 mt-8 border-t border-slate-200 dark:border-white/10">
                                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                        Showing <span className="font-bold text-slate-700 dark:text-slate-200">{(page - 1) * limit + 1}</span> to <span className="font-bold text-slate-700 dark:text-slate-200">{Math.min(page * limit, total)}</span> of <span className="font-bold text-slate-700 dark:text-slate-200">{total}</span> sessions
                                    </span>

                                    {totalPages > 1 && (
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                                disabled={page === 1}
                                                className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg shadow-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                            >
                                                Previous
                                            </button>

                                            {getPageNumbers(page, totalPages).map((p, idx) => (
                                                typeof p === "number" ? (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setPage(p)}
                                                        className={`min-w-[32px] h-8 px-2 text-xs font-bold rounded-lg transition-all ${
                                                            page === p
                                                                ? "bg-indigo-600 text-white shadow-xs"
                                                                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                                        }`}
                                                    >
                                                        {p}
                                                    </button>
                                                ) : (
                                                    <span key={idx} className="px-1 text-xs text-slate-400 font-bold">...</span>
                                                )
                                            ))}

                                            <button
                                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                                disabled={page >= totalPages}
                                                className="px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg shadow-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowCreate(false)} />
                    <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl max-w-md w-full p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-1.5">New Session</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Select a date and optional title for the new session.</p>
                        </div>
                        <form onSubmit={handleCreate} noValidate className="flex flex-col gap-4">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-2">
                                    Session Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    ref={dateRef}
                                    type="date"
                                    value={newDate}
                                    max={toLocalDateStr(tz)}
                                    onChange={(e) => setNewDate(e.target.value)}
                                    className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:scheme-dark transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-2">
                                    Title <span className="text-slate-400 font-normal lowercase">(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={newTitle}
                                    placeholder="e.g. Morning Shift, General Session"
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                />
                            </div>

                            {createError && (
                                <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-red-200 dark:border-red-900/40">
                                    {createError}
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-3 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreate(false)}
                                    className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createLoading}
                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all cursor-pointer"
                                >
                                    {createLoading ? "Creating..." : "Create Session"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Edit Session Modal ── */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsEditModalOpen(false)} />
                    <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl max-w-md w-full p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-1.5">Edit Session Title</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                                Update the display title for session on <span className="font-bold text-slate-700 dark:text-slate-300">{editingSession && formatShortDate(editingSession.session_date, tz)}</span>.
                            </p>
                        </div>
                        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest mb-2">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    value={editSessionTitle}
                                    placeholder="e.g. Morning Shift, General Session"
                                    onChange={(e) => setEditSessionTitle(e.target.value)}
                                    className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={editLoading}
                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-500/20 disabled:opacity-50 transition-all cursor-pointer"
                                >
                                    {editLoading ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Delete Confirmation Modal ── */}
            {sessionToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setSessionToDelete(null)} />
                    <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl max-w-md w-full p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200 text-center">
                        <div className="w-12 h-12 bg-red-50 dark:bg-red-950/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100 dark:border-red-900/40 text-red-500">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Delete Session?</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                            Are you sure you want to delete session <span className="font-bold text-slate-700 dark:text-slate-200">{sessionToDelete.title || formatShortDate(sessionToDelete.session_date, tz)}</span>? This action cannot be undone.
                        </p>
                        <div className="flex items-center justify-center gap-3">
                            <button
                                type="button"
                                onClick={() => setSessionToDelete(null)}
                                className="px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteConfirm}
                                disabled={!!deletingId}
                                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-red-500/20 disabled:opacity-50 transition-all cursor-pointer"
                            >
                                {deletingId ? "Deleting..." : "Delete Session"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
