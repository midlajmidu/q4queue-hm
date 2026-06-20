"use client";

import { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "@/lib/api";
import type { GlobalQueueDetail } from "@/types/api";

export default function QueueMonitoringPage() {
    const [queues, setQueues] = useState<GlobalQueueDetail[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    
    // Pagination state
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 20;

    // Debounce search input
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1); // Reset to page 1 on new search
        }, 500);
        return () => clearTimeout(handler);
    }, [search]);

    const fetchQueues = useCallback(async () => {
        setIsLoading(true);
        try {
            const offset = (page - 1) * limit;
            const res = await api.getGlobalQueues(limit, offset, debouncedSearch);
            setQueues(res.items);
            setTotalPages(res.pages || 1);
        } catch (err) {
            console.error("Failed to fetch global queues", err);
        } finally {
            setIsLoading(false);
        }
    }, [page, debouncedSearch]);

    useEffect(() => {
        fetchQueues();
        // Optional: refresh every 15 seconds
        const interval = setInterval(fetchQueues, 15000);
        return () => clearInterval(interval);
    }, [fetchQueues]);

    const handleAction = async (queueId: string, actionName: "pause" | "resume" | "clear") => {
        setActionLoading(`${queueId}-${actionName}`);
        try {
            if (actionName === "pause") {
                await api.pauseGlobalQueue(queueId);
                setQueues(prev => prev.map(q => q.id === queueId ? { ...q, status: "Paused" } : q));
            } else if (actionName === "resume") {
                await api.resumeGlobalQueue(queueId);
                setQueues(prev => prev.map(q => q.id === queueId ? { ...q, status: "Active" } : q));
            } else if (actionName === "clear") {
                await api.clearGlobalQueue(queueId);
                setQueues(prev => prev.map(q => q.id === queueId ? { ...q, customers_waiting: 0 } : q));
            }
        } catch (err) {
            let msg = "Failed to perform action.";
            if (err instanceof ApiError) msg = err.detail;
            alert(msg);
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        Global Queue Monitoring
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">Real-time supervision and emergency controls for all active queues.</p>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
                {/* Toolbar */}
                <div className="p-5 border-b border-slate-800 bg-slate-900/50">
                    <div className="relative max-w-md">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by organization or queue name..."
                            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-colors"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-800/50 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Queue Details</th>
                                <th className="px-6 py-4 text-center">Current Pos</th>
                                <th className="px-6 py-4 text-center">Waiting</th>
                                <th className="px-6 py-4 text-center">Avg Wait</th>
                                <th className="px-6 py-4 text-center">Staff</th>
                                <th className="px-6 py-4 text-right">Emergency Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="w-6 h-6 border-2 border-slate-600 border-t-indigo-500 rounded-full animate-spin" />
                                            <p>Loading active queues...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : queues.length > 0 ? (
                                queues.map(q => (
                                    <tr key={q.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-slate-200 font-medium">{q.queue_name}</span>
                                                <span className="text-slate-400 text-xs">{q.organization}</span>
                                                <div className="mt-1">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                                        q.status === "Active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                                    }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${q.status === "Active" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                                                        {q.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-xl font-bold text-white">#{q.current_position}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className={`text-xl font-bold ${q.customers_waiting > 20 ? 'text-red-400' : q.customers_waiting > 10 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                    {q.customers_waiting}
                                                </span>
                                                <span className="text-[10px] text-slate-500 uppercase">People</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="text-slate-300 font-medium">{q.average_wait_time}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1 text-slate-300">
                                                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                                {q.staff_handling}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                {q.status === "Active" ? (
                                                    <button 
                                                        onClick={() => handleAction(q.id, "pause")}
                                                        disabled={actionLoading !== null}
                                                        className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                                                    >
                                                        {actionLoading === `${q.id}-pause` ? "Pausing..." : "Pause Queue"}
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => handleAction(q.id, "resume")}
                                                        disabled={actionLoading !== null}
                                                        className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                                                    >
                                                        {actionLoading === `${q.id}-resume` ? "Resuming..." : "Resume Queue"}
                                                    </button>
                                                )}
                                                
                                                <button 
                                                    onClick={() => {
                                                        if (confirm("Are you sure you want to clear all waiting customers from this queue? This action cannot be undone.")) {
                                                            handleAction(q.id, "clear");
                                                        }
                                                    }}
                                                    disabled={actionLoading !== null || q.customers_waiting === 0}
                                                    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                                                >
                                                    {actionLoading === `${q.id}-clear` ? "Clearing..." : (
                                                        <>
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                            Clear
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        No active queues found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination Controls */}
                {!isLoading && totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/50">
                        <span className="text-sm text-slate-400">
                            Page {page} of {totalPages}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg border border-slate-700 hover:bg-slate-700 disabled:opacity-50 transition-colors text-sm font-medium"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg border border-slate-700 hover:bg-slate-700 disabled:opacity-50 transition-colors text-sm font-medium"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
