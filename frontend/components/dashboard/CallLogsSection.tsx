"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useBranchTimezone } from "@/context/BranchTimezoneContext";
import { fmtDateTime } from "@/lib/tzformat";
import {
    CallLogItem,
    CallLogsOverviewResponse,
    PaginatedCallLogsResponse,
    StaffCallStat,
} from "@/types/api";
import {
    Phone,
    Clock,
    CreditCard,
    TrendingUp,
    Search,
    ChevronLeft,
    ChevronRight,
    User,
    RefreshCw,
    Info,
    Calendar,
    BarChart3,
    ListFilter,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
    queueId?: string;
    isDark?: boolean;
}

export function CallLogsSection({ queueId, isDark = false }: Props) {
    const tz = useBranchTimezone();
    const [subTab, setSubTab] = useState<"overview" | "history">("overview");

    // Overview State
    const [overview, setOverview] = useState<CallLogsOverviewResponse | null>(null);
    const [overviewLoading, setOverviewLoading] = useState(true);

    // History State
    const [history, setHistory] = useState<PaginatedCallLogsResponse | null>(null);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [limit] = useState(15);

    const fetchOverview = useCallback(async () => {
        setOverviewLoading(true);
        try {
            const res = await api.getCallLogsOverview(queueId);
            setOverview(res);
        } catch {
            toast.error("Failed to load call logs overview");
        } finally {
            setOverviewLoading(false);
        }
    }, [queueId]);

    const fetchHistory = useCallback(async () => {
        setHistoryLoading(true);
        try {
            const res = await api.getCallLogs({
                queue_id: queueId,
                search: search ? search.trim() : undefined,
                page,
                limit,
            });
            setHistory(res);
        } catch {
            toast.error("Failed to load call log history");
        } finally {
            setHistoryLoading(false);
        }
    }, [queueId, search, page, limit]);

    useEffect(() => {
        if (subTab === "overview") {
            fetchOverview();
        } else {
            fetchHistory();
        }
    }, [subTab, fetchOverview, fetchHistory]);

    // Format Duration helper
    const formatDuration = (seconds: number) => {
        if (!seconds || seconds <= 0) return "0s";
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (mins === 0) return `${secs}s`;
        if (secs === 0) return `${mins}m`;
        return `${mins}m ${secs}s`;
    };

    return (
        <div className="space-y-6">
            {/* Header Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Phone size={20} className="text-indigo-500" />
                        Call Logs & Telephony Analytics
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Track Plivo WebRTC calls, staff call activity, and billable call minutes.
                    </p>
                </div>

                {/* Sub-tab Navigation */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/60">
                    <button
                        onClick={() => setSubTab("overview")}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${subTab === "overview"
                                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            }`}
                    >
                        <BarChart3 size={14} /> Overview
                    </button>
                    <button
                        onClick={() => setSubTab("history")}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${subTab === "history"
                                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            }`}
                    >
                        <ListFilter size={14} /> Call History
                    </button>
                </div>
            </div>

            {/* TAB 1: OVERVIEW */}
            {subTab === "overview" && (
                <div className="space-y-6">
                    {/* Stat Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Total Calls */}
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Total Calls Made
                                </span>
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400">
                                    <Phone size={18} />
                                </div>
                            </div>
                            <div className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
                                {overviewLoading ? "..." : overview?.total_calls ?? 0}
                            </div>
                            <span className="text-[11px] text-slate-400 mt-1 block">Total WebRTC call attempts</span>
                        </div>

                        {/* Plivo Billable Minutes */}
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-emerald-200/80 dark:border-emerald-500/30 shadow-sm relative overflow-hidden">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                    Plivo Billable Mins
                                </span>
                                <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
                                    <CreditCard size={18} />
                                </div>
                            </div>
                            <div className="mt-3 text-2xl font-black text-slate-900 dark:text-white flex items-baseline gap-1.5">
                                {overviewLoading ? "..." : overview?.total_billable_minutes ?? 0}
                                <span className="text-xs font-bold text-emerald-500 uppercase">Mins</span>
                            </div>
                            <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-md w-fit" title="Plivo charges per 60-second increment (e.g., 30s = 1 min billable)">
                                <Info size={11} /> 60s Increment Billed
                            </div>
                        </div>

                        {/* Actual Duration Spoken */}
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Actual Time Spoken
                                </span>
                                <div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
                                    <Clock size={18} />
                                </div>
                            </div>
                            <div className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
                                {overviewLoading ? "..." : formatDuration(overview?.total_duration_seconds ?? 0)}
                            </div>
                            <span className="text-[11px] text-slate-400 mt-1 block">Cumulative talk time</span>
                        </div>

                        {/* Average Call Duration */}
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Avg Call Duration
                                </span>
                                <div className="p-2 bg-amber-50 dark:bg-amber-500/10 rounded-xl text-amber-600 dark:text-amber-400">
                                    <TrendingUp size={18} />
                                </div>
                            </div>
                            <div className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
                                {overviewLoading ? "..." : formatDuration(Math.round(overview?.avg_duration_seconds ?? 0))}
                            </div>
                            <span className="text-[11px] text-slate-400 mt-1 block">Average per completed call</span>
                        </div>
                    </div>

                    {/* Staff Call Breakdown Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                                    Staff Call Usage & Billable Minutes
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Call statistics grouped by staff members for the selected queue.
                                </p>
                            </div>
                            <button
                                onClick={fetchOverview}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                                title="Refresh"
                            >
                                <RefreshCw size={16} className={overviewLoading ? "animate-spin" : ""} />
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                                        <th className="py-3 px-4">Staff Member</th>
                                        <th className="py-3 px-4">Total Calls</th>
                                        <th className="py-3 px-4">Actual Duration</th>
                                        <th className="py-3 px-4">Plivo Billable Mins</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                                    {overviewLoading ? (
                                        <tr>
                                            <td colSpan={4} className="py-8 text-center text-slate-400">
                                                Loading staff metrics...
                                            </td>
                                        </tr>
                                    ) : !overview?.staff_stats || overview.staff_stats.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-8 text-center text-slate-400">
                                                No calls recorded yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        overview.staff_stats.map((s, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="py-3 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                                                        <User size={14} />
                                                    </div>
                                                    {s.staff_name}
                                                </td>
                                                <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                                                    {s.call_count} calls
                                                </td>
                                                <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                                                    {formatDuration(s.total_duration_seconds)}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                                                        {s.total_billable_minutes} mins
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: CALL HISTORY */}
            {subTab === "history" && (
                <div className="space-y-4">
                    {/* Filter & Search Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="relative w-full sm:w-72">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by phone or customer..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end text-xs text-slate-500">
                            <span>
                                Page <strong>{history?.page ?? 1}</strong> of <strong>{history?.pages ?? 1}</strong> ({history?.total ?? 0} total)
                            </span>
                            <button
                                onClick={fetchHistory}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                                title="Refresh"
                            >
                                <RefreshCw size={15} className={historyLoading ? "animate-spin" : ""} />
                            </button>
                        </div>
                    </div>

                    {/* Call History Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                                        <th className="py-3 px-4">Date & Time</th>
                                        <th className="py-3 px-4">Staff Member</th>
                                        <th className="py-3 px-4">Customer</th>
                                        <th className="py-3 px-4">Queue</th>
                                        <th className="py-3 px-4">Actual Time</th>
                                        <th className="py-3 px-4">Plivo Billable</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                                    {historyLoading ? (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center text-slate-400">
                                                Loading call history...
                                            </td>
                                        </tr>
                                    ) : !history?.items || history.items.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center text-slate-400">
                                                No calls found.
                                            </td>
                                        </tr>
                                    ) : (
                                        history.items.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                                                    {fmtDateTime(item.created_at, tz)}
                                                </td>
                                                <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                                    {item.called_by_name || "Staff Member"}
                                                </td>
                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    <div className="font-bold text-slate-900 dark:text-white">
                                                        {item.customer_phone}
                                                    </div>
                                                    {item.customer_name && (
                                                        <div className="text-[11px] text-slate-400">
                                                            {item.customer_name}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                                    {item.queue_name || "—"}
                                                </td>
                                                <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                    {formatDuration(item.duration_seconds)}
                                                </td>
                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                                                        {item.billable_minutes} min{item.billable_minutes !== 1 ? "s" : ""}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        {history && history.pages > 1 && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <ChevronLeft size={14} /> Previous
                                </button>

                                <span className="text-xs font-medium text-slate-500">
                                    Page {page} of {history.pages}
                                </span>

                                <button
                                    onClick={() => setPage((p) => Math.min(history.pages, p + 1))}
                                    disabled={page >= history.pages}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Next <ChevronRight size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
