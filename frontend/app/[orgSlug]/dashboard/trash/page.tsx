"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { QueueResponse } from "@/types/api";
import { useBranchTimezone } from "@/context/BranchTimezoneContext";
import { fmtDate, fmtTime } from "@/lib/tzformat";
import { toast } from "sonner";

export default function TrashPage() {
    const tz = useBranchTimezone();
    const { user, isReadOnly, isImpersonating } = useAuth();
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
            const date = fmtDate(queue.created_at, tz);
            if (!acc[date]) acc[date] = [];
            acc[date].push(queue);
            return acc;
        }, {} as Record<string, QueueResponse[]>);
    }, [filteredQueues, tz]);

    const hasActiveFilters = filterDate || filterName;

    return (
        <div className="w-full pb-12 fade-in">
            {/* ── Page Header ── */}
            <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mb-2 tracking-widest uppercase">
                        <span className="text-slate-600 dark:text-slate-400">Trash</span>
                    </div>
                    <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight m-0">Deleted Queues</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                        {canRestore
                            ? "Browse deleted queues. As an admin, you can restore them back to their session."
                            : "View deleted queues from your branch. Contact an admin to restore them."}
                    </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl px-4 py-2.5">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium text-[13px]">
                        {canRestore ? "Restoration is subject to queue limits per session." : "Only Global Admins can restore queues."}
                    </span>
                </div>
            </div>

            {/* ── Table Card ── */}
            <div className="card bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-200">
                
                {/* Filter Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 md:px-5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/20">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest mr-2">
                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707l-6.414 6.414A1 1 0 0014 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 018 21v-7.586a1 1 0 00-.293-.707L1.293 6.707A1 1 0 011 6V4z" />
                            </svg>
                            Filter By
                        </div>
                        
                        {/* Date filter */}
                        <div className="flex items-center gap-2 h-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg px-3 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all min-w-[150px] shadow-sm relative">
                            <input
                                type={filterDate ? "date" : "text"}
                                placeholder="All Dates"
                                onFocus={(e) => (e.target.type = "date")}
                                onBlur={(e) => !e.target.value && (e.target.type = "text")}
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                                className="bg-transparent border-none outline-none text-[13px] text-slate-700 dark:text-slate-300 font-semibold w-full placeholder:text-slate-400 placeholder:font-semibold"
                            />
                            {!filterDate && (
                                <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            )}
                        </div>

                        {/* Queue name filter */}
                        <div className="relative shadow-sm rounded-lg">
                            <select
                                value={filterName}
                                onChange={(e) => setFilterName(e.target.value)}
                                className="h-9 pl-3 pr-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg text-[13px] text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer min-w-[150px] appearance-none"
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
                                className="flex items-center gap-1.5 h-9 px-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-[12px] font-bold text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                    
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        {filteredQueues.length} of {queues.length}
                    </span>
                </div>
                
                {/* Content Area */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <div className="w-8 h-8 border-3 border-slate-100 dark:border-slate-800 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin mx-auto" />
                        <span className="text-[13px] font-semibold text-slate-500">Loading trash...</span>
                    </div>
                ) : queues.length === 0 || filteredQueues.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 px-6 bg-slate-50/30 dark:bg-slate-900/50">
                        <div className="w-14 h-14 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-4 shadow-sm">
                            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>
                        <span className="text-[15px] font-bold text-slate-900 dark:text-white mb-1.5">
                            {queues.length === 0 ? "Trash is Clean" : "No results found"}
                        </span>
                        <span className="text-[13px] text-slate-500 max-w-[300px] text-center leading-relaxed">
                            {queues.length === 0 ? "No deleted queues found. When queues are deleted from a session, they'll appear here." : "No deleted queues match your current filters."}
                        </span>
                    </div>
                ) : (
                    <div className="w-full overflow-x-auto scrollbar-hide">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800/60">
                                    <th className="py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Queue Name</th>
                                    <th className="py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Prefix</th>
                                    <th className="py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Removed From</th>
                                    <th className="py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Deleted On</th>
                                    <th className="py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredQueues.map((queue, idx) => (
                                    <tr
                                        key={queue.id}
                                        className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors fade-in group"
                                        style={{ animationDelay: `${idx * 15}ms` }}
                                    >
                                        <td className="py-4 px-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400 flex items-center justify-center border border-red-100 dark:border-red-500/20">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </div>
                                                <span className="text-[14px] font-bold text-slate-900 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                                                    {queue.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-5">
                                            <span className="inline-flex items-center justify-center px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                {queue.prefix}
                                            </span>
                                        </td>

                                        <td className="py-4 px-5">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[13px] font-semibold text-slate-900 dark:text-white">
                                                    {fmtDate(queue.created_at, tz)}
                                                </span>
                                                <span className="text-[11px] font-medium text-slate-500">
                                                    {fmtTime(queue.created_at, tz)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-5 text-right">
                                            {canRestore ? (
                                                <button
                                                    onClick={() => handleRestore(queue.id)}
                                                    disabled={restoringId === queue.id}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white border border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:-translate-y-0.5 hover:shadow focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                                                >
                                                    {restoringId === queue.id ? (
                                                        <>
                                                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                                            Restoring...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                                            </svg>
                                                            Restore
                                                        </>
                                                    )}
                                                </button>
                                            ) : (
                                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                                    Admin Only
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
