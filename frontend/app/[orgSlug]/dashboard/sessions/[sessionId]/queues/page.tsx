"use client";
import { use, useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { QueueResponse, SessionResponse } from "@/types/api";
import { useAuth } from "@/hooks/useAuth";
import QueueCard from "@/components/QueueCard";

interface PageProps {
    params: Promise<{ sessionId: string }>;
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function isToday(dateStr: string): boolean {
    return dateStr === new Date().toISOString().slice(0, 10);
}

export default function SessionQueuesPage({ params }: PageProps) {
    const { sessionId } = use(params);
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const dashBase = user?.org_slug ? `/${user.org_slug}/dashboard` : "/dashboard";
    const isStaff = user?.role === "staff";

    const [session, setSession] = useState<SessionResponse | null>(null);
    const [queues, setQueues] = useState<QueueResponse[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [filterName, setFilterName] = useState("");
    const [debouncedFilterName, setDebouncedFilterName] = useState("");
    const LIMIT = 12;
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Create queue modal state
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState("");
    const [newPrefix, setNewPrefix] = useState("A");
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const nameRef = useRef<HTMLInputElement>(null);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedFilterName(filterName);
            setPage(1); // Reset to first page on search
        }, 300);
        return () => clearTimeout(timer);
    }, [filterName]);

    useEffect(() => {
        if (!isInitialLoading && queues.length >= 0) {
            const action = searchParams.get("action");
            if (action === "create") {
                if (!isStaff) setShowCreate(true);
                // Clear the URL
                router.replace(`${dashBase}/sessions/${sessionId}/queues`);
            } else if (action === "qr") {
                // For QR, we could show an alert or highlight the first queue's QR
                // But if there are no queues, maybe show the create modal instead?
                if (queues.length === 0 && !isStaff) {
                    setShowCreate(true);
                }
                router.replace(`${dashBase}/sessions/${sessionId}/queues`);
            }
        }
    }, [isInitialLoading, queues.length, searchParams, isStaff, dashBase, sessionId, router]);

    const loadSession = useCallback(async () => {
        setError(null);
        try {
            const sessionData = await api.getSession(sessionId);
            setSession(sessionData);
        } catch (err: unknown) {
            if (err instanceof Error) setError(err.message);
            else setError("Failed to load session");
        }
    }, [sessionId]);

    const loadQueues = useCallback(async (isInitial = false) => {
        if (isInitial) setIsInitialLoading(true);
        else setIsBackgroundLoading(true);

        setError(null);
        try {
            const queuesRes = await api.listSessionQueues(sessionId, LIMIT, (page - 1) * LIMIT, debouncedFilterName || undefined);
            setQueues(queuesRes.items || []);
            setTotal(queuesRes.total);
        } catch (err: unknown) {
            if (err instanceof Error) setError(err.message);
            else setError("Failed to load queues");
        } finally {
            setIsInitialLoading(false);
            setIsBackgroundLoading(false);
        }
    }, [sessionId, page, debouncedFilterName]);

    // Initial load: Session + Queues
    useEffect(() => {
        Promise.all([loadSession(), loadQueues(true)]);
    }, [sessionId]);

    // Background updates: Search/Pagination
    useEffect(() => {
        if (!isInitialLoading) {
            loadQueues(false);
        }
    }, [page, debouncedFilterName]);

    // Split queues into active vs inactive
    const activeQueues = useMemo(() => queues.filter(q => q.is_active), [queues]);
    const inactiveQueues = useMemo(() => queues.filter(q => !q.is_active), [queues]);
    const [inactiveCollapsed, setInactiveCollapsed] = useState(false);

    useEffect(() => {
        if (showCreate) {
            setNewName("");
            setNewPrefix("A");
            setCreateError(null);
            setTimeout(() => nameRef.current?.focus(), 100);
        }
    }, [showCreate]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;
        setCreateLoading(true);
        setCreateError(null);
        try {
            await api.createSessionQueue(sessionId, {
                name: newName.trim(),
                prefix: newPrefix.trim() || "A",
            });
            setShowCreate(false);
            loadQueues(false);
        } catch (err: unknown) {
            if (err instanceof ApiError) setCreateError(err.detail);
            else setCreateError("Failed to create queue");
        } finally {
            setCreateLoading(false);
        }
    };

    const totalPages = Math.ceil(total / LIMIT);

    if (isInitialLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-10 h-10 border-[3px] border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-gray-500 font-medium">Loading session…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-transparent pb-16 w-full">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">

                {/* ── Background loading bar ── */}
                {isBackgroundLoading && (
                    <div className="fixed top-0 left-0 right-0 h-0.5 z-[60]">
                        <div className="h-full bg-blue-500 animate-[progress_1s_infinite_linear] origin-left" />
                    </div>
                )}
                <style>{`
                    @keyframes progress {
                        0% { transform: scaleX(0); }
                        50% { transform: scaleX(0.5); }
                        100% { transform: scaleX(1); opacity: 0; }
                    }
                `}</style>

                {/* ── Header Card ── */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 shadow-sm ring-1 ring-slate-900/5 dark:border-white/10 p-6 w-full">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-5 w-full">
                        {/* Left: Title & Meta */}
                        <div>
                            <div className="flex items-center gap-3 mb-1.5">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${session && isToday(session.session_date) ? "bg-blue-600" : "bg-gray-100"}`}>
                                    <svg className={`w-5 h-5 ${session && isToday(session.session_date) ? "text-white" : "text-gray-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
                                        {session ? formatDate(session.session_date) : "Session Queues"}
                                        {session && isToday(session.session_date) && (
                                            <span className="ml-2.5 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-900/50 px-2 py-0.5 rounded-md align-middle">Today</span>
                                        )}
                                    </h1>
                                    {session?.title && (
                                        <p className="text-sm text-slate-500 font-medium mt-0.5">
                                            {session.title.toLowerCase() === "asdfsfs" ? "Regular working hours" : session.title.charAt(0).toUpperCase() + session.title.slice(1).toLowerCase()}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2.5 mt-3 ml-[52px]">
                                <span className="text-sm text-gray-500 font-medium">
                                    {queues.length} {queues.length === 1 ? "queue" : "queues"}
                                </span>
                                {activeQueues.length > 0 && (
                                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-900/50 px-2 py-0.5 rounded-md">
                                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                        {activeQueues.length} active
                                    </span>
                                )}
                                {inactiveQueues.length > 0 && (
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-2 py-0.5 rounded-md">
                                        {inactiveQueues.length} inactive
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Right: Search & Create */}
                        <div className="flex items-center justify-end gap-3 flex-wrap">
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-100 shadow-sm ring-1 ring-slate-900/5 dark:border-white/10 rounded-xl px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all w-full sm:w-56">
                                <svg className="w-4 h-4 text-gray-400 dark:text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    value={filterName}
                                    onChange={(e) => setFilterName(e.target.value)}
                                    className="text-sm text-gray-900 dark:text-white font-medium focus:outline-none bg-transparent w-full placeholder:text-gray-400 dark:placeholder:text-slate-500"
                                    placeholder="Search queues…"
                                />
                                {filterName && (
                                    <button onClick={() => { setFilterName(""); setPage(1); }} className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                            {!isStaff && (
                                <button
                                    onClick={() => setShowCreate(true)}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm px-4 h-10 transition-colors duration-200 shadow-sm shadow-indigo-500/10 flex items-center gap-2 flex-shrink-0"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                    </svg>
                                    New Queue
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Error ── */}
                {error && (
                    <div role="alert" className="bg-red-50 text-red-700 px-5 py-4 rounded-2xl border border-red-200 text-sm flex items-center justify-between font-medium">
                        <span>{error}</span>
                        <button onClick={() => { loadSession(); loadQueues(true); }} className="underline font-bold hover:text-red-900 transition-colors">Retry</button>
                    </div>
                )}

                {/* ── Queues Content ── */}
                <div className={`transition-opacity duration-200 ${isBackgroundLoading ? "opacity-60 pointer-events-none" : "opacity-100"}`}>
                    {queues.length === 0 ? (
                        /* Empty state */
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 text-center py-24 px-8">
                            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">No queues in this session</h3>
                            <p className="text-sm text-gray-500 font-medium mb-8 max-w-xs mx-auto leading-relaxed">
                                Add your first queue to start serving customers in this session.
                            </p>
                            {!isStaff && (
                                <button
                                    onClick={() => setShowCreate(true)}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors duration-200 shadow-sm shadow-indigo-500/10 text-sm"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                    </svg>
                                    Create First Queue
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-8">
                            {/* ── Active Queues ── */}
                            {activeQueues.length > 0 && (
                                <section>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        <h2 className="text-sm font-semibold text-slate-900 dark:text-white tracking-wide">ACTIVE QUEUES</h2>
                                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100/80 px-2 py-0.5 rounded-full">{activeQueues.length}</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 max-w-7xl mt-6">
                                        {activeQueues.map((q) => (
                                            <QueueCard key={q.id} queue={q} onToggled={() => loadQueues(false)} />
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* ── Inactive Queues ── */}
                            {inactiveQueues.length > 0 && (
                                <section>
                                    <button
                                        onClick={() => setInactiveCollapsed(c => !c)}
                                        className="flex items-center gap-3 mb-5 group cursor-pointer w-full text-left"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                                            <div className="w-2.5 h-2.5 bg-gray-400 rounded-full" />
                                        </div>
                                        <h2 className="text-sm font-black text-gray-400 dark:text-slate-400 uppercase tracking-wider flex-1 text-left">Inactive Queues</h2>
                                        <span className="text-[11px] font-bold text-gray-400 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-2 py-0.5 rounded-full mr-1">{inactiveQueues.length}</span>
                                        <svg
                                            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${inactiveCollapsed ? "-rotate-90" : "rotate-0"}`}
                                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>
                                    {!inactiveCollapsed && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 max-w-7xl mt-6">
                                            {inactiveQueues.map((q) => (
                                                <QueueCard key={q.id} queue={q} onToggled={() => loadQueues(false)} />
                                            ))}
                                        </div>
                                    )}
                                </section>
                            )}

                            {/* ── All inactive warning ── */}
                            {activeQueues.length === 0 && inactiveQueues.length > 0 && (
                                <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-3">
                                    <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                                    <p className="text-sm text-amber-800 font-medium">All queues are currently inactive. Activate a queue to start serving customers.</p>
                                </div>
                            )}

                            {/* ── Pagination ── */}
                            {total > LIMIT && (
                                <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-gray-200 shadow-sm">
                                    <p className="text-xs text-gray-500 font-medium">
                                        Showing <span className="text-gray-900 font-bold">{(page - 1) * LIMIT + 1}</span> to <span className="text-gray-900 font-bold">{Math.min(page * LIMIT, total)}</span> of <span className="text-gray-900 font-bold">{total}</span> queues
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className="px-4 py-2 text-xs font-bold bg-white border border-slate-100 shadow-sm ring-1 ring-slate-900/5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                                        >
                                            Previous
                                        </button>
                                        <span className="text-xs font-bold text-gray-400 tabular-nums px-2">
                                            {page} / {totalPages}
                                        </span>
                                        <button
                                            onClick={() => setPage(p => p + 1)}
                                            disabled={page * LIMIT >= total}
                                            className="px-4 py-2 text-xs font-bold bg-white border border-slate-100 shadow-sm ring-1 ring-slate-900/5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Create Queue Modal ── */}
                {showCreate && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
                        <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 animate-in fade-in zoom-in duration-200">
                            <button
                                onClick={() => setShowCreate(false)}
                                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-5">
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-black text-gray-900 mb-1">Create New Queue</h3>
                            <p className="text-sm text-gray-500 font-medium mb-6">Define a new service line for this session.</p>

                            <form onSubmit={handleCreate} className="flex flex-col gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Queue Name</label>
                                    <input
                                        ref={nameRef}
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="e.g. Doctor A, Counter 1"
                                        required
                                        className="w-full rounded-xl border border-slate-100 shadow-sm ring-1 ring-slate-900/5 bg-white px-4 py-3 text-sm font-medium focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 focus:outline-none transition-all placeholder:text-slate-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Token Prefix</label>
                                    <input
                                        type="text"
                                        value={newPrefix}
                                        onChange={(e) => setNewPrefix(e.target.value.toUpperCase())}
                                        placeholder="A"
                                        maxLength={5}
                                        className="w-full rounded-xl border border-slate-100 shadow-sm ring-1 ring-slate-900/5 bg-white px-4 py-3 text-sm font-medium focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 focus:outline-none transition-all placeholder:text-slate-400"
                                    />
                                </div>
                                {createError && (
                                    <div className="px-4 py-3 rounded-xl bg-red-50 text-red-600 text-xs font-semibold border border-red-100">
                                        {createError}
                                    </div>
                                )}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreate(false)}
                                        className="flex-1 px-4 py-3 text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={createLoading || !newName.trim()}
                                        className="flex-1 px-4 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 shadow-sm shadow-indigo-500/10"
                                    >
                                        {createLoading ? "Building…" : "Build Queue"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
