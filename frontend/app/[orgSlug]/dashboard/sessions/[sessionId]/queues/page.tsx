"use client";
import { use, useEffect, useState, useCallback, useRef } from "react";
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
    const LIMIT = 12;
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Create queue modal state
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState("");
    const [newPrefix, setNewPrefix] = useState("A");
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const nameRef = useRef<HTMLInputElement>(null);

    // Handle quick actions from dashboard
    useEffect(() => {
        if (!isLoading && queues.length >= 0) {
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
    }, [isLoading, queues.length, searchParams, isStaff, dashBase, sessionId, router]);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [sessionData, queuesRes] = await Promise.all([
                api.getSession(sessionId),
                api.listSessionQueues(sessionId, LIMIT, (page - 1) * LIMIT, filterName || undefined),
            ]);
            setSession(sessionData);
            setQueues(queuesRes.items || []);
            setTotal(queuesRes.total);
        } catch (err: unknown) {
            if (err instanceof Error) setError(err.message);
            else setError("Failed to load session data");
        } finally {
            setIsLoading(false);
        }
    }, [sessionId, page, filterName]);

    useEffect(() => { loadData(); }, [loadData]);

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
            loadData();
        } catch (err: unknown) {
            if (err instanceof ApiError) setCreateError(err.detail);
            else setCreateError("Failed to create queue");
        } finally {
            setCreateLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="text-center py-24">
                <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm text-gray-500 font-medium">Loading session...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            {/* Breadcrumb + Header */}
            <div>
                <nav className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                    <Link href={`${dashBase}/sessions`} className="hover:text-gray-600 transition-colors">Sessions</Link>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-gray-600 font-medium">
                        {session ? formatDate(session.session_date) : "Session"}
                    </span>
                </nav>

                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${session && isToday(session.session_date) ? "bg-blue-600" : "bg-gray-100"}`}>
                                <svg className={`w-5 h-5 ${session && isToday(session.session_date) ? "text-white" : "text-gray-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    {session ? formatDate(session.session_date) : "Session Queues"}
                                    {session && isToday(session.session_date) && (
                                        <span className="ml-2 text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded align-middle">Today</span>
                                    )}
                                </h1>
                                {session?.title && (
                                    <p className="text-sm text-gray-500 mt-0.5">{session.title}</p>
                                )}
                            </div>
                        </div>
                        <p className="mt-2 text-sm text-gray-500 ml-13">
                            {queues.length} {queues.length === 1 ? "queue" : "queues"} in this session
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm w-full sm:w-auto">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                value={filterName}
                                onChange={(e) => {
                                    setFilterName(e.target.value);
                                    setPage(1);
                                }}
                                className="text-sm text-gray-900 focus:outline-none bg-transparent w-full sm:w-48"
                                placeholder="Search queues..."
                            />
                            {filterName && (
                                <button onClick={() => { setFilterName(""); setPage(1); }} className="text-gray-400 hover:text-gray-600">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            )}
                        </div>
                        {!isStaff && (
                            <button
                                onClick={() => setShowCreate(true)}
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm text-sm flex-shrink-0"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                </svg>
                                New Queue
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div role="alert" className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 text-sm flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={loadData} className="underline font-medium">Retry</button>
                </div>
            )}

            {/* Queues Grid */}
            {queues.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 text-center py-20 px-6">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">No queues in this session</h3>
                    <p className="text-sm text-gray-500 mb-8 max-w-sm mx-auto">Add your first queue to start serving customers in this session.</p>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-100 text-sm"
                    >
                        + Create First Queue
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {queues.map((q) => (
                            <QueueCard key={q.id} queue={q} onToggled={loadData} />
                        ))}
                    </div>

                    {/* Pagination */}
                    {total > LIMIT && (
                        <div className="flex items-center justify-between bg-white px-6 py-4 rounded-2xl border border-gray-200 shadow-sm">
                            <p className="text-xs text-gray-500 font-medium">
                                Showing <span className="text-gray-900 font-bold">{(page - 1) * LIMIT + 1}</span> to <span className="text-gray-900 font-bold">{Math.min(page * LIMIT, total)}</span> of <span className="text-gray-900 font-bold">{total}</span> queues
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-4 py-2 text-xs font-bold bg-white border border-gray-200 rounded-lg shadow-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={page * LIMIT >= total}
                                    className="px-4 py-2 text-xs font-bold bg-white border border-gray-200 rounded-lg shadow-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Create Queue Modal */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">Create New Queue</h3>
                        <p className="text-xs text-gray-500 mb-6">Define a new service line for this session.</p>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Queue Name</label>
                                <input
                                    ref={nameRef}
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="e.g. Doctor A, Counter 1"
                                    required
                                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-50 focus:outline-none transition-all placeholder:text-gray-300"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Token Prefix</label>
                                <input
                                    type="text"
                                    value={newPrefix}
                                    onChange={(e) => setNewPrefix(e.target.value.toUpperCase())}
                                    placeholder="A"
                                    maxLength={5}
                                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-50 focus:outline-none transition-all placeholder:text-gray-300"
                                />
                            </div>
                            {createError && (
                                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-xs font-medium border border-red-100">
                                    {createError}
                                </div>
                            )}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreate(false)}
                                    className="flex-1 px-4 py-3 text-sm font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createLoading || !newName.trim()}
                                    className="flex-1 px-4 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 transition-colors shadow-lg shadow-blue-100"
                                >
                                    {createLoading ? "Building..." : "Build Queue"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
