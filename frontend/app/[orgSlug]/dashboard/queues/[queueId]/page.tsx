"use client";

import { use, useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useDashBase } from "@/hooks/useDashBase";
import { useAuth } from "@/hooks/useAuth";
import type { QueueResponse, SessionResponse, PaginatedSessionResponse } from "@/types/api";
import { CalendarDays, ChevronLeft, ChevronRight, ChevronDown, Plus, Loader2, Trash2, LayoutGrid, List, Pause, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { useBranchTimezone } from "@/context/BranchTimezoneContext";
import { localTodayStr } from "@/lib/tzformat";
import ConfirmModal from "@/components/ConfirmModal";

interface PageProps {
    params: Promise<{ queueId: string }>;
}

function formatDate(dateStr: string): string {
    try {
        const d = new Date(dateStr + "T00:00:00");
        return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    } catch {
        return dateStr;
    }
}

function formatShortDate(dateStr: string): string {
    try {
        const d = new Date(dateStr + "T00:00:00");
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
        return dateStr;
    }
}

function isToday(dateStr: string, tz: string = "Asia/Kolkata"): boolean {
    return dateStr === localTodayStr(tz);
}

export default function QueueSessionListPage({ params }: PageProps) {
    const { queueId } = use(params);
    const dashBase = useDashBase();
    const { user } = useAuth();
    const router = useRouter();
    const tz = useBranchTimezone();
    const isGlobalOrOrgAdmin = user?.role === "super_admin" || user?.role === "organization_admin";

    const [queue, setQueue] = useState<QueueResponse | null>(null);
    const [sessions, setSessions] = useState<SessionResponse[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const LIMIT = 20;
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [openingToday, setOpeningToday] = useState(false);

    const [selectedDate, setSelectedDate] = useState<string>("");

    // Scalability UI state (View Mode & Month Grouping)
    const [viewMode, setViewMode] = useState<"cards" | "compact">("cards");
    const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});

    const toggleMonthCollapse = (monthKey: string) => {
        setCollapsedMonths(prev => ({
            ...prev,
            [monthKey]: !prev[monthKey]
        }));
    };

    // Group sessions by Month & Year for clean scalable navigation
    const groupedSessions = useMemo(() => {
        const map = new Map<string, {
            monthKey: string;
            monthLabel: string;
            isCurrentMonth: boolean;
            totalIssued: number;
            totalServed: number;
            items: SessionResponse[];
        }>();

        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

        sessions.forEach(session => {
            const d = new Date(session.session_date + "T12:00:00");
            const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            const monthLabel = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
            const isCurrentMonth = monthKey === currentMonthKey;

            if (!map.has(monthKey)) {
                map.set(monthKey, {
                    monthKey,
                    monthLabel,
                    isCurrentMonth,
                    totalIssued: 0,
                    totalServed: 0,
                    items: []
                });
            }
            const group = map.get(monthKey)!;
            group.items.push(session);
            group.totalIssued += session.total_issued || 0;
            group.totalServed += session.total_served || 0;
        });

        return Array.from(map.values());
    }, [sessions]);

    // Create session modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newSessionDate, setNewSessionDate] = useState(() => localTodayStr(tz));
    const [newSessionTitle, setNewSessionTitle] = useState("");
    const [creatingSession, setCreatingSession] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    useEffect(() => {
        if (isCreateModalOpen) {
            setNewSessionDate(localTodayStr(tz));
        }
    }, [isCreateModalOpen, tz]);

    // Delete session modal state
    const [sessionToDelete, setSessionToDelete] = useState<SessionResponse | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // End session modal state & Action loading states
    const [sessionToEnd, setSessionToEnd] = useState<SessionResponse | null>(null);
    const [sessionActionLoading, setSessionActionLoading] = useState<Record<string, string>>({});

    const handleToggleSessionActive = async (session: SessionResponse) => {
        const currentlyActive = session.is_active !== false;
        if (currentlyActive && !sessionToEnd) {
            setSessionToEnd(session);
            return;
        }

        const nextActive = !currentlyActive;
        setSessionActionLoading(prev => ({ ...prev, [session.id]: 'active' }));
        try {
            await api.toggleSessionActive(session.id, nextActive);
            setSessions(prev => prev.map(s => s.id === session.id ? { ...s, is_active: nextActive } : s));
            if (nextActive) {
                toast.success("Session activated. Ready for customer tokens.");
            } else {
                toast.warning("Session stopped. Token registrations are now closed.");
            }
            setSessionToEnd(null);
        } catch (err: any) {
            toast.error(err?.message || "Failed to toggle session active state");
        } finally {
            setSessionActionLoading(prev => {
                const copy = { ...prev };
                delete copy[session.id];
                return copy;
            });
        }
    };

    const handleToggleSessionPaused = async (session: SessionResponse) => {
        const currentlyPaused = session.is_paused === true;
        const nextPaused = !currentlyPaused;
        setSessionActionLoading(prev => ({ ...prev, [session.id]: 'paused' }));
        try {
            await api.toggleSessionPaused(session.id, nextPaused);
            if (nextPaused) {
                toast.warning("Session is on break. Token registrations are paused.");
            } else {
                toast.success("Session resumed. Ready for customer tokens.");
            }
        } catch (err: any) {
            toast.error(err?.message || "Failed to pause/resume session");
        } finally {
            setSessionActionLoading(prev => {
                const copy = { ...prev };
                delete copy[session.id];
                return copy;
            });
        }
    };

    const loadSessions = useCallback(async (pageNum: number, append = false, dateToUse?: string) => {
        if (append) setLoadingMore(true);
        try {
            const offset = (pageNum - 1) * LIMIT;
            const cleanDate = dateToUse && dateToUse.trim() ? dateToUse.trim() : undefined;
            const res: PaginatedSessionResponse = await api.listQueueSessions(queueId, LIMIT, offset, cleanDate);
            setSessions(prev => append ? [...prev, ...res.items] : res.items);
            setTotal(res.total);
        } catch (err: any) {
            console.error("Failed to load sessions:", err);
            toast.error(err?.message || "Failed to load sessions");
        } finally {
            setLoadingMore(false);
        }
    }, [queueId]);

    useEffect(() => {
        api.getQueue(queueId).then((q) => {
            setQueue(q);
            if (typeof window !== "undefined") {
                try {
                    sessionStorage.setItem(`queue_cache_${queueId}`, JSON.stringify(q));
                } catch { }
            }
        }).catch(() => {});
    }, [queueId]);

    useEffect(() => {
        setLoading(true);
        setPage(1);
        loadSessions(1, false, selectedDate).finally(() => setLoading(false));
    }, [queueId, selectedDate, loadSessions]);

    const handleCreateSession = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError(null);

        if (!newSessionDate) {
            setCreateError("Please select a date for the session.");
            return;
        }

        const todayStr = localTodayStr(tz);
        if (newSessionDate > todayStr) {
            setCreateError("Cannot create a session for a future date.");
            return;
        }

        // Check if session for this date already exists in current list
        const exists = sessions.some(s => s.session_date === newSessionDate);
        if (exists) {
            setCreateError("A session already exists for this date.");
            return;
        }

        setCreatingSession(true);
        try {
            const newSession = await api.createQueueSession(queueId, {
                session_date: newSessionDate,
                title: newSessionTitle.trim() || undefined,
            });
            toast.success("Session created successfully!");
            setIsCreateModalOpen(false);
            setNewSessionTitle("");
            // Refresh sessions list
            loadSessions(1, false, selectedDate);
            // Navigate to newly created session
            router.push(`${dashBase}/queues/${queueId}/sessions/${newSession.id}`);
        } catch (err: any) {
            const msg = err?.detail || err?.message || "Failed to create session";
            setCreateError(msg);
        } finally {
            setCreatingSession(false);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!sessionToDelete) return;
        setDeletingId(sessionToDelete.id);
        try {
            await api.deleteSession(sessionToDelete.id);
            toast.success("Session deleted successfully");
            setSessionToDelete(null);
            loadSessions(1, false, selectedDate);
        } catch (err: any) {
            toast.error(err?.message || "Failed to delete session");
        } finally {
            setDeletingId(null);
        }
    };

    const handleLoadMore = async () => {
        const nextPage = page + 1;
        setPage(nextPage);
        await loadSessions(nextPage, true, selectedDate);
    };

    const hasMore = sessions.length < total;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-slate-500 font-medium">Loading sessions…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">

                {/* ── Page Header ── */}
                <div className="mb-8">
                    {/* Breadcrumb */}
                    <Link
                        href={`${dashBase}/queues`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mb-4 group"
                    >
                        <svg className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        Back to Queues
                    </Link>

                    <div className="flex flex-wrap items-start justify-between gap-4">
                        {/* Title block */}
                        <div>
                            <div className="flex items-center gap-2.5 mb-1">
                                <h1 className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
                                    {queue?.name ? `${queue.name}` : "Sessions"}
                                </h1>
                                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">/ Sessions</span>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {total > 0 ? `${total} session${total === 1 ? "" : "s"} total` : "No sessions yet"}
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2.5">
                            {/* View Mode Switcher (Cards vs Compact Table) */}
                            <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-white/10 shrink-0 shadow-sm">
                                <button
                                    onClick={() => setViewMode("cards")}
                                    className={`p-1.5 rounded-md transition-all cursor-pointer ${
                                        viewMode === "cards"
                                            ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                            : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                    }`}
                                    title="Card View"
                                >
                                    <LayoutGrid size={15} />
                                </button>
                                <button
                                    onClick={() => setViewMode("compact")}
                                    className={`p-1.5 rounded-md transition-all cursor-pointer ${
                                        viewMode === "compact"
                                            ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                            : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                    }`}
                                    title="Compact List View"
                                >
                                    <List size={15} />
                                </button>
                            </div>

                            {/* Date filter chip */}
                            <div className="relative flex items-center">
                                <div className={`flex items-center gap-2 h-9 px-3 rounded-lg border transition-all shadow-sm ${
                                    selectedDate
                                        ? "bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-700/50 dark:text-indigo-300"
                                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 dark:bg-slate-900 dark:border-white/10 dark:text-slate-400"
                                }`}>
                                    <CalendarDays className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onClick={(e) => { try { (e.target as HTMLInputElement).showPicker(); } catch {} }}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                                    />
                                    {selectedDate && (
                                        <button
                                            onClick={() => setSelectedDate("")}
                                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5 cursor-pointer ml-1"
                                            title="Clear date filter"
                                        >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Create button */}
                            {!isGlobalOrOrgAdmin && (
                                <button
                                    onClick={() => {
                                        setCreateError(null);
                                        setNewSessionDate(localTodayStr(tz));
                                        setNewSessionTitle("");
                                        setIsCreateModalOpen(true);
                                    }}
                                    className="flex items-center gap-2 h-9 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
                                >
                                    <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                                    New Session
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Active date filter pill ── */}
                {selectedDate && (
                    <div className="flex items-center gap-2 mb-5">
                        <span className="text-xs text-slate-500 dark:text-slate-400">Showing results for</span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
                            <CalendarDays className="w-3 h-3" />
                            {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                        </span>
                        <button onClick={() => setSelectedDate("")} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer underline underline-offset-2">clear</button>
                    </div>
                )}

                {/* ── Session List (Grouped by Month & Year) ── */}
                {sessions.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/8 shadow-sm flex flex-col items-center justify-center py-20 px-6 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 flex items-center justify-center mb-4">
                            <CalendarDays className="w-7 h-7 text-slate-400 dark:text-slate-500" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-1">
                            {selectedDate ? "No sessions on this date" : "No sessions yet"}
                        </h3>
                        <p className="text-sm text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed mb-6">
                            {selectedDate
                                ? "Try a different date or clear the filter."
                                : "Create your first session to start managing daily queue operations."}
                        </p>
                        {!isGlobalOrOrgAdmin && !selectedDate && (
                            <button
                                onClick={() => {
                                    setCreateError(null);
                                    setNewSessionDate(localTodayStr(tz));
                                    setNewSessionTitle("");
                                    setIsCreateModalOpen(true);
                                }}
                                className="flex items-center gap-2 h-9 px-5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                                Create First Session
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
                        {groupedSessions.map((group: any) => {
                            const isCollapsed = collapsedMonths[group.monthKey] === true;

                            return (
                                <div key={group.monthKey} className="flex flex-col gap-2.5">
                                    {/* Month Accordion Header */}
                                    <button
                                        onClick={() => toggleMonthCollapse(group.monthKey)}
                                        className="flex items-center justify-between px-4 py-2.5 bg-slate-100/80 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-white/8 text-left transition-all hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`} />
                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">{group.monthLabel}</span>
                                            <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                                                {group.items.length} {group.items.length === 1 ? "session" : "sessions"}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                                            <span><strong className="text-slate-700 dark:text-slate-200">{group.totalIssued}</strong> Issued</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                                            <span><strong className="text-emerald-600 dark:text-emerald-400">{group.totalServed}</strong> Served</span>
                                        </div>
                                    </button>

                                    {/* Month Items (Rendered if not collapsed) */}
                                    {!isCollapsed && (
                                        viewMode === "cards" ? (
                                            /* CARDS VIEW */
                                            <div className="flex flex-col gap-2">
                                                {group.items.map((session: SessionResponse) => {
                                                    const today = isToday(session.session_date);
                                                    const d = new Date(session.session_date + "T12:00:00");
                                                    const dayNum = d.getDate();
                                                    const monthAbbr = d.toLocaleDateString("en-US", { month: "short" });
                                                    const weekday = d.toLocaleDateString("en-US", { weekday: "long" });
                                                    const fullDate = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
                                                    const isPaused = session.is_paused === true;
                                                    const isInactive = session.is_active === false;

                                                    return (
                                                        <div key={session.id} className="relative group">
                                                            <Link
                                                                href={`${dashBase}/queues/${queueId}/sessions/${session.id}`}
                                                                className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 bg-white dark:bg-slate-900 rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 px-5 py-4 cursor-pointer overflow-hidden ${
                                                                    today
                                                                        ? "border-indigo-200 dark:border-indigo-700/50 hover:border-indigo-300 dark:hover:border-indigo-600"
                                                                        : "border-slate-200 dark:border-white/8 hover:border-slate-300 dark:hover:border-white/15"
                                                                }`}
                                                            >
                                                                <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full ${
                                                                    isPaused ? "bg-amber-500" : isInactive ? "bg-slate-400" : today ? "bg-indigo-500" : "bg-slate-200 dark:bg-white/10"
                                                                }`} />

                                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                                    <div className={`flex flex-col items-center justify-center rounded-xl w-11 h-12 shrink-0 ${
                                                                        isPaused
                                                                            ? "bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200"
                                                                            : isInactive
                                                                            ? "bg-slate-100 dark:bg-slate-800 text-slate-500"
                                                                            : today
                                                                            ? "bg-indigo-600 text-white"
                                                                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                                                                    }`}>
                                                                        <span className={`text-[9px] font-bold uppercase tracking-widest leading-none mb-0.5 ${today && !isPaused && !isInactive ? "text-indigo-200" : "text-slate-400 dark:text-slate-500"}`}>
                                                                            {monthAbbr}
                                                                        </span>
                                                                        <span className="text-[18px] font-bold leading-none">{dayNum}</span>
                                                                    </div>

                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                                                            <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                                                                {session.title && session.title !== session.session_date ? session.title : weekday}
                                                                            </span>
                                                                            {isPaused ? (
                                                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold uppercase tracking-widest shrink-0">
                                                                                    ⏸ PAUSED
                                                                                </span>
                                                                            ) : isInactive ? (
                                                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest shrink-0">
                                                                                    CLOSED
                                                                                </span>
                                                                            ) : today ? (
                                                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-widest shrink-0">
                                                                                    <span className="relative flex h-1.5 w-1.5">
                                                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                                                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
                                                                                    </span>
                                                                                    Live
                                                                                </span>
                                                                            ) : null}
                                                                        </div>
                                                                        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{fullDate}</p>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-white/5">
                                                                    <div className="flex items-center gap-3 shrink-0">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <div className="w-5 h-5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                                                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-indigo-500"><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>
                                                                            </div>
                                                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{session.total_issued}</span>
                                                                            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Issued</span>
                                                                        </div>
                                                                        <div className="w-px h-4 bg-slate-100 dark:bg-white/10" />
                                                                        <div className="flex items-center gap-1.5">
                                                                            <div className="w-5 h-5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                                                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                                                            </div>
                                                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{session.total_served}</span>
                                                                            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Served</span>
                                                                        </div>
                                                                    </div>

                                                                    {!isGlobalOrOrgAdmin && today && (
                                                                        <div className="flex items-center gap-1.5" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleToggleSessionPaused(session)}
                                                                                disabled={sessionActionLoading[session.id] !== undefined || isInactive}
                                                                                className={`h-7 px-2.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all border shadow-sm ${
                                                                                    isPaused
                                                                                        ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/40 hover:bg-amber-100"
                                                                                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700"
                                                                                } disabled:opacity-40 disabled:cursor-not-allowed`}
                                                                                title={isPaused ? "Resume Session" : "Take a Break"}
                                                                            >
                                                                                {isPaused ? <Play className="w-3 h-3 text-amber-600" /> : <Pause className="w-3 h-3 text-slate-500" />}
                                                                                <span>{isPaused ? "Resume" : "Take a Break"}</span>
                                                                            </button>

                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleToggleSessionActive(session)}
                                                                                disabled={sessionActionLoading[session.id] !== undefined}
                                                                                className={`h-7 px-2.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all border shadow-sm ${
                                                                                    isInactive
                                                                                        ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/40 hover:bg-emerald-100"
                                                                                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700"
                                                                                } disabled:opacity-40 disabled:cursor-not-allowed`}
                                                                                title={isInactive ? "Start Session" : "End Session"}
                                                                            >
                                                                                {isInactive ? <Play className="w-3 h-3 text-emerald-600" /> : <Square className="w-2.5 h-2.5 fill-slate-400 text-slate-400" />}
                                                                                <span>{isInactive ? "Start Session" : "End Session"}</span>
                                                                            </button>
                                                                        </div>
                                                                    )}

                                                                    {!isGlobalOrOrgAdmin && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSessionToDelete(session); }}
                                                                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-all cursor-pointer z-10"
                                                                            title="Delete session"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    )}

                                                                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors shrink-0 ml-1" strokeWidth={2.5} />
                                                                </div>
                                                            </Link>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            /* COMPACT HIGH-DENSITY TABLE VIEW */
                                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-white/8 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-sm">
                                                {group.items.map((session: SessionResponse) => {
                                                    const today = isToday(session.session_date);
                                                    const d = new Date(session.session_date + "T12:00:00");
                                                    const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
                                                    const isPaused = session.is_paused === true;
                                                    const isInactive = session.is_active === false;

                                                    return (
                                                        <div key={session.id} className="relative group flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                                                            <Link
                                                                href={`${dashBase}/queues/${queueId}/sessions/${session.id}`}
                                                                className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                                                            >
                                                                <span className={`w-2 h-2 rounded-full shrink-0 ${isPaused ? "bg-amber-500" : isInactive ? "bg-slate-400" : today ? "bg-indigo-500 animate-pulse" : "bg-slate-300 dark:bg-slate-700"}`} />
                                                                <span className="font-semibold text-xs text-slate-900 dark:text-white shrink-0">
                                                                    {session.session_date}
                                                                </span>
                                                                <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">({weekday})</span>

                                                                {session.title && session.title !== session.session_date && (
                                                                    <span className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate ml-1">
                                                                        {session.title}
                                                                    </span>
                                                                )}

                                                                {isPaused ? (
                                                                    <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-900/40 shrink-0 ml-1">
                                                                        PAUSED
                                                                    </span>
                                                                ) : isInactive ? (
                                                                    <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded border border-slate-200 dark:border-white/10 shrink-0 ml-1">
                                                                        CLOSED
                                                                    </span>
                                                                ) : today ? (
                                                                    <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded border border-indigo-200 dark:border-indigo-800/50 shrink-0 ml-1">
                                                                        LIVE
                                                                    </span>
                                                                ) : null}
                                                            </Link>

                                                            <div className="flex items-center gap-3 text-xs shrink-0">
                                                                <span className="text-slate-500 dark:text-slate-400"><strong className="text-slate-900 dark:text-white font-bold">{session.total_issued}</strong> Issued</span>
                                                                <span className="text-emerald-600 dark:text-emerald-400"><strong className="text-emerald-700 dark:text-emerald-300 font-bold">{session.total_served}</strong> Served</span>

                                                                {!isGlobalOrOrgAdmin && today && (
                                                                    <div className="flex items-center gap-1.5" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleToggleSessionPaused(session)}
                                                                            disabled={sessionActionLoading[session.id] !== undefined || isInactive}
                                                                            className={`h-6 px-2 rounded-md text-[10px] font-semibold flex items-center gap-1 transition-all border shadow-sm ${
                                                                                isPaused
                                                                                    ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/40 hover:bg-amber-100"
                                                                                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700"
                                                                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                                                                            title={isPaused ? "Resume Session" : "Take a Break"}
                                                                        >
                                                                            {isPaused ? <Play className="w-2.5 h-2.5 text-amber-600" /> : <Pause className="w-2.5 h-2.5 text-slate-500" />}
                                                                            <span className="hidden md:inline">{isPaused ? "Resume" : "Break"}</span>
                                                                        </button>

                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleToggleSessionActive(session)}
                                                                            disabled={sessionActionLoading[session.id] !== undefined}
                                                                            className={`h-6 px-2 rounded-md text-[10px] font-semibold flex items-center gap-1 transition-all border shadow-sm ${
                                                                                isInactive
                                                                                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/40 hover:bg-emerald-100"
                                                                                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700"
                                                                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                                                                            title={isInactive ? "Start Session" : "End Session"}
                                                                        >
                                                                            {isInactive ? <Play className="w-2.5 h-2.5 text-emerald-600" /> : <Square className="w-2 h-2 fill-slate-400 text-slate-400" />}
                                                                            <span className="hidden md:inline">{isInactive ? "Start" : "End"}</span>
                                                                        </button>
                                                                    </div>
                                                                )}

                                                                {!isGlobalOrOrgAdmin && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSessionToDelete(session); }}
                                                                        className="w-6 h-6 rounded flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all opacity-0 group-hover:opacity-100 cursor-pointer ml-1"
                                                                        title="Delete session"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}

                                                                <Link href={`${dashBase}/queues/${queueId}/sessions/${session.id}`} className="text-slate-300 dark:text-slate-600 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors">
                                                                    <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
                                                                </Link>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )
                                    )}
                                </div>
                            );
                        })}

                        {/* Load more */}
                        {hasMore && (
                            <div className="flex justify-center pt-3">
                                <button
                                    onClick={handleLoadMore}
                                    disabled={loadingMore}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 text-sm font-semibold text-slate-600 dark:text-slate-400 transition-all hover:shadow-sm disabled:opacity-50 cursor-pointer"
                                >
                                    {loadingMore ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                    Load older sessions
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Create Session Modal ── */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => setIsCreateModalOpen(false)} />
                    <div className="relative bg-white dark:bg-slate-900 w-full sm:rounded-2xl sm:max-w-md rounded-t-2xl border-t sm:border border-slate-200 dark:border-white/10 shadow-2xl p-6 sm:p-7 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
                        <div className="flex items-start justify-between mb-5">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">New Session</h3>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-medium">One session allowed per day per queue</p>
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            </button>
                        </div>

                        <form onSubmit={handleCreateSession} noValidate className="flex flex-col gap-4">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                                    Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={newSessionDate}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setNewSessionDate(val);
                                        if (val && val > localTodayStr(tz)) {
                                            setCreateError("Cannot create a session for a future date.");
                                        } else {
                                            setCreateError(null);
                                        }
                                    }}
                                    className={`w-full h-10 px-3.5 bg-slate-50 dark:bg-slate-800 border ${
                                        createError && (!newSessionDate || newSessionDate > localTodayStr(tz))
                                            ? "border-red-500 dark:border-red-500/80 focus:ring-red-500/25 focus:border-red-500"
                                            : "border-slate-200 dark:border-white/10 focus:ring-indigo-500/25 focus:border-indigo-500"
                                    } rounded-lg text-slate-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 transition-all`}
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5">
                                    Title <span className="text-slate-400 font-normal lowercase normal-case">(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={newSessionTitle}
                                    placeholder="e.g. Morning Shift, Walk-ins"
                                    onChange={(e) => setNewSessionTitle(e.target.value)}
                                    className="w-full h-10 px-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white text-sm font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all"
                                />
                            </div>

                            {createError && (
                                <div className="flex items-start gap-2.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-medium px-3.5 py-2.5 rounded-lg border border-red-100 dark:border-red-900/40 leading-relaxed">
                                    <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01" strokeLinecap="round"/></svg>
                                    {createError}
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2.5 pt-1">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creatingSession}
                                    className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm shadow-indigo-600/20 disabled:opacity-50 transition-all cursor-pointer"
                                >
                                    {creatingSession && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    {creatingSession ? "Creating…" : "Create Session"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── Delete Confirmation Modal ── */}
            {sessionToDelete && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={() => !deletingId && setSessionToDelete(null)} />
                    <div className="relative bg-white dark:bg-slate-900 w-full sm:rounded-2xl sm:max-w-sm rounded-t-2xl border-t sm:border border-slate-200 dark:border-white/10 shadow-2xl p-6 sm:p-7 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 text-center">
                        <div className="w-11 h-11 bg-red-50 dark:bg-red-950/40 rounded-xl flex items-center justify-center mx-auto mb-4 border border-red-100 dark:border-red-900/30">
                            <Trash2 className="w-5 h-5 text-red-500" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">Delete Session?</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                            Delete <span className="font-semibold text-slate-700 dark:text-slate-200">
                                {sessionToDelete.title && sessionToDelete.title !== sessionToDelete.session_date
                                    ? sessionToDelete.title
                                    : formatShortDate(sessionToDelete.session_date)}
                            </span>? This action cannot be undone.
                        </p>
                        <div className="flex items-center justify-center gap-2.5">
                            <button
                                type="button"
                                onClick={() => setSessionToDelete(null)}
                                disabled={!!deletingId}
                                className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-50 transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteConfirm}
                                disabled={!!deletingId}
                                className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg shadow-sm shadow-red-600/20 disabled:opacity-50 transition-all cursor-pointer"
                            >
                                {deletingId && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                {deletingId ? "Deleting…" : "Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── End Session Confirmation Modal ── */}
            <ConfirmModal
                isOpen={!!sessionToEnd}
                title="End Queue Session?"
                message={`Are you sure you want to end the session "${sessionToEnd?.title || sessionToEnd?.session_date}"? New customers won't be able to join until you start it again.`}
                confirmLabel="End Session"
                confirmVariant="warning"
                onConfirm={() => sessionToEnd && handleToggleSessionActive(sessionToEnd)}
                onCancel={() => setSessionToEnd(null)}
                isLoading={sessionToEnd ? sessionActionLoading[sessionToEnd.id] === 'active' : false}
            />
        </div>
    );
}