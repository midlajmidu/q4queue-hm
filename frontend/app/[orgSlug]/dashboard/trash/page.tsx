"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { QueueResponse } from "@/types/api";
import { toast } from "sonner";

export default function TrashPage() {
    const { user, isImpersonating } = useAuth();
    const canRestore = user?.role === "super_admin" || user?.role === "organization_admin" || isImpersonating;

    const [queues, setQueues] = useState<QueueResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [restoringId, setRestoringId] = useState<string | null>(null);

    // Filters
    const [filterDate, setFilterDate] = useState("");
    const [filterName, setFilterName] = useState("");

    const loadTrash = async () => {
        setIsLoading(true);
        try {
            const data = await api.listTrashQueues();
            setQueues(data);
        } catch (error: any) {
            toast.error(error.message || "Failed to load trash");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadTrash();
    }, []);

    const handleRestore = async (queueId: string) => {
        if (!canRestore) return;
        setRestoringId(queueId);
        try {
            await api.restoreQueue(queueId);
            toast.success("Queue restored successfully");
            setQueues((prev) => prev.filter((q) => q.id !== queueId));
        } catch (error: any) {
            toast.error(error.message || "Failed to restore queue");
        } finally {
            setRestoringId(null);
        }
    };

    // Unique queue names for filter dropdown
    const uniqueNames = useMemo(() => {
        return Array.from(new Set(queues.map((q) => q.name))).sort();
    }, [queues]);

    // Filtered + grouped queues
    const filteredQueues = useMemo(() => {
        return queues.filter((q) => {
            const qDate = new Date(q.created_at).toISOString().slice(0, 10);
            if (filterDate && qDate !== filterDate) return false;
            if (filterName && q.name !== filterName) return false;
            return true;
        });
    }, [queues, filterDate, filterName]);

    const groupedQueues = useMemo(() => {
        return filteredQueues.reduce((acc, queue) => {
            const date = new Date(queue.created_at).toLocaleDateString("en-US", {
                weekday: "long", year: "numeric", month: "long", day: "numeric",
            });
            if (!acc[date]) acc[date] = [];
            acc[date].push(queue);
            return acc;
        }, {} as Record<string, QueueResponse[]>);
    }, [filteredQueues]);

    const hasActiveFilters = filterDate || filterName;

    return (
        <div className="max-w-6xl mx-auto pb-12">
            {/* ── Page Header ── */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2 tracking-wide uppercase">
                        <span className="text-slate-600">Trash</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight m-0">Deleted Queues</h1>
                    <p className="text-sm text-slate-500 mt-1 font-medium">
                        {canRestore
                            ? "Browse deleted queues. As an admin, you can restore them back to their session."
                            : "View deleted queues from your branch. Contact an admin to restore them."}
                    </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                    <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-amber-700 font-medium text-xs">
                        {canRestore ? "Restoration is subject to queue limits per session." : "Only Global Admins can restore queues."}
                    </span>
                </div>
            </div>

            {/* ── Filter Bar ── */}
            <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707l-6.414 6.414A1 1 0 0014 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 018 21v-7.586a1 1 0 00-.293-.707L1.293 6.707A1 1 0 011 6V4z" />
                </svg>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">Filter by</span>

                {/* Date filter */}
                <div className="flex items-center gap-2 h-9 bg-slate-50 border border-slate-200 rounded-lg px-3 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all min-w-[160px]">
                    <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth="2" />
                        <path d="M16 2v4M8 2v4M3 10h18" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="bg-transparent border-none outline-none text-sm text-slate-700 font-medium w-full"
                        placeholder="Date"
                    />
                    {filterDate && (
                        <button onClick={() => setFilterDate("")} className="p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
                            <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                        </button>
                    )}
                </div>

                {/* Queue name filter */}
                <div className="relative">
                    <select
                        value={filterName}
                        onChange={(e) => setFilterName(e.target.value)}
                        className="h-9 pl-3 pr-8 bg-slate-50 border border-slate-200 shadow-none rounded-lg text-sm text-slate-700 font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer min-w-[160px]"
                    >
                        <option value="">All Queues</option>
                        {uniqueNames.map((name) => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                    <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                </div>

                {hasActiveFilters && (
                    <button
                        onClick={() => { setFilterDate(""); setFilterName(""); }}
                        className="flex items-center gap-1.5 h-9 px-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
                    >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                        Clear filters
                    </button>
                )}

                <span className="ml-auto text-xs text-slate-400 font-medium">{filteredQueues.length} of {queues.length} deleted queues</span>
            </div>

            {/* ── Loading ── */}
            {isLoading ? (
                <div className="text-center py-24">
                    <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4 shadow-sm" />
                    <p className="text-sm text-slate-500 font-medium">Loading deleted queues...</p>
                </div>
            ) : queues.length === 0 ? (
                /* ── Completely empty ── */
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm text-center py-24 px-6 flex flex-col items-center">
                    <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-5 shadow-sm">
                        <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Trash is Clean</h3>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                        No deleted queues found. When queues are deleted from a session, they'll appear here.
                    </p>
                </div>
            ) : filteredQueues.length === 0 ? (
                /* ── Filtered empty ── */
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm text-center py-16 px-6 flex flex-col items-center">
                    <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4">
                        <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mb-1.5">No results found</h3>
                    <p className="text-sm text-slate-500 max-w-xs mx-auto">No deleted queues match your current filters.</p>
                    <button
                        onClick={() => { setFilterDate(""); setFilterName(""); }}
                        className="mt-4 text-sm text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
                    >
                        Clear filters
                    </button>
                </div>
            ) : (
                /* ── Queue groups ── */
                <div className="space-y-8">
                    {Object.entries(groupedQueues).map(([date, dateQueues]) => (
                        <div key={date}>
                            {/* Date header */}
                            <div className="flex items-center gap-4 mb-4">
                                <div className="px-3 py-1 bg-white border border-slate-200 shadow-sm rounded-lg">
                                    <span className="text-[11px] font-extrabold tracking-widest text-slate-500 uppercase whitespace-nowrap">{date}</span>
                                </div>
                                <div className="flex-1 h-px bg-slate-200" />
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                    {dateQueues.length} {dateQueues.length === 1 ? "queue" : "queues"}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {dateQueues.map((queue) => (
                                    <div
                                        key={queue.id}
                                        className="group relative bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-red-100 p-5 transition-all duration-300 overflow-hidden"
                                    >
                                        {/* Subtle deleted background pattern */}
                                        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl z-0 opacity-50">
                                            <svg className="absolute right-0 bottom-0 w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
                                                <path d="M0,70 C40,50 80,90 120,70 C160,50 200,90 240,70 C280,50 320,90 360,70 L400,60 L400,100 L0,100 Z" fill="#ef4444" fillOpacity="0.04" />
                                                <path d="M0,80 C50,62 100,95 150,78 C200,60 250,95 300,78 L400,65 L400,100 L0,100 Z" fill="#f97316" fillOpacity="0.03" />
                                            </svg>
                                        </div>

                                        <div className="relative z-10">
                                            {/* Card top row */}
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1 min-w-0 mr-3">
                                                    <h3 className="text-base font-bold text-slate-900 truncate group-hover:text-red-600 transition-colors">
                                                        {queue.name}
                                                    </h3>
                                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                                                            <span className="text-slate-400">Prefix</span> {queue.prefix}
                                                        </span>
                                                        <span className="inline-flex items-center gap-1 rounded-md bg-red-50 border border-red-100 px-2 py-0.5 text-xs font-semibold text-red-500">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                            Deleted
                                                        </span>
                                                    </div>
                                                </div>
                                                {/* Deleted indicator badge */}
                                                <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                                                    <svg className="w-4.5 h-4.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </div>
                                            </div>

                                            {/* Restore button — only admins */}
                                            {canRestore ? (
                                                <div className="mt-4 pt-3 border-t border-slate-100">
                                                    <button
                                                        onClick={() => handleRestore(queue.id)}
                                                        disabled={restoringId === queue.id}
                                                        className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
                                                    >
                                                        {restoringId === queue.id ? (
                                                            <>
                                                                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                                                Restoring...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                                                </svg>
                                                                Restore Queue
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="mt-4 pt-3 border-t border-slate-100">
                                                    <p className="text-xs text-slate-400 text-center font-medium">
                                                        Contact an admin to restore this queue
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
