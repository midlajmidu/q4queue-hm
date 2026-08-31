"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useBranchTimezone } from "@/context/BranchTimezoneContext";
import { fmtDateTime } from "@/lib/tzformat";
import {
    CallLogsOverviewResponse,
    PaginatedCallLogsResponse,
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
    BarChart3,
    ListFilter,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
    queueId?: string;
    isDark?: boolean;
}

export function CallLogsSection({ queueId }: Props) {
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/70 dark:backdrop-blur-xl p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs">
                <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20 shrink-0">
                        <Phone size={22} strokeWidth={2.2} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                            Voice Call Logs & Telephony
                        </h2>
                        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1 font-normal">
                            WebRTC live call history, staff call activity, and billable telephony minutes
                        </p>
                    </div>
                </div>

                {/* Sub-tab Navigation */}
                <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-white/5 self-start sm:self-auto shrink-0">
                    <button
                        onClick={() => setSubTab("overview")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold transition-all cursor-pointer ${subTab === "overview"
                            ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                    >
                        <BarChart3 size={15} /> Overview
                    </button>
                    <button
                        onClick={() => setSubTab("history")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold transition-all cursor-pointer ${subTab === "history"
                            ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                    >
                        <ListFilter size={15} /> Call History
                    </button>
                </div>
            </div>

            {/* TAB 1: OVERVIEW */}
            {subTab === "overview" && (
                <div className="space-y-6">
                    {/* Stat Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                        {/* Total Calls */}
                        <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl p-4 sm:p-4.5 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-2xs flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">
                                    Total Calls Made
                                </span>
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                    <Phone size={15} strokeWidth={2.5} />
                                </div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
                                    {overviewLoading ? "..." : overview?.total_calls ?? 0}
                                </div>
                                <span className="text-[12px] font-medium text-slate-400 dark:text-slate-500">WebRTC call attempts</span>
                            </div>
                        </div>

                        {/* Billable Minutes */}
                        <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl p-4 sm:p-4.5 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-2xs flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[13px] font-semibold text-emerald-600 dark:text-emerald-400">
                                    Billable Minutes
                                </span>
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                    <CreditCard size={15} strokeWidth={2.5} />
                                </div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight flex items-baseline gap-1">
                                    {overviewLoading ? "..." : overview?.total_billable_minutes ?? 0}
                                    <span className="text-xs font-bold uppercase text-emerald-500">Mins</span>
                                </div>
                                <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                    <Info size={12} /> 60s increment rounded
                                </div>
                            </div>
                        </div>

                        {/* Actual Duration Spoken */}
                        <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl p-4 sm:p-4.5 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-2xs flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">
                                    Actual Time Spoken
                                </span>
                                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                    <Clock size={15} strokeWidth={2.5} />
                                </div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 tabular-nums tracking-tight">
                                    {overviewLoading ? "..." : formatDuration(overview?.total_duration_seconds ?? 0)}
                                </div>
                                <span className="text-[12px] font-medium text-slate-400 dark:text-slate-500">Cumulative talk time</span>
                            </div>
                        </div>

                        {/* Average Call Duration */}
                        <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl p-4 sm:p-4.5 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-2xs flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">
                                    Avg Call Duration
                                </span>
                                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                    <TrendingUp size={15} strokeWidth={2.5} />
                                </div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums tracking-tight">
                                    {overviewLoading ? "..." : formatDuration(Math.round(overview?.avg_duration_seconds ?? 0))}
                                </div>
                                <span className="text-[12px] font-medium text-slate-400 dark:text-slate-500">Average per completed call</span>
                            </div>
                        </div>
                    </div>

                    {/* Staff Call Breakdown Table */}
                    <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl rounded-xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-xs">
                        <div className="px-5 py-3.5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                                    Staff Call Activity & Billable Minutes
                                </h3>
                                <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    Aggregated calling metrics per staff agent
                                </p>
                            </div>
                            <button
                                onClick={fetchOverview}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Refresh"
                            >
                                <RefreshCw size={14} className={overviewLoading ? "animate-spin" : ""} />
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50/75 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider font-bold border-b border-slate-200/60 dark:border-white/5">
                                    <tr>
                                        <th className="px-5 py-3">Staff Member</th>
                                        <th className="px-5 py-3">Total Calls</th>
                                        <th className="px-5 py-3">Actual Duration</th>
                                        <th className="px-5 py-3 text-right">Billable Mins</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-200 font-medium">
                                    {overviewLoading ? (
                                        <tr>
                                            <td colSpan={4} className="py-8 text-center text-slate-400 text-[13px]">
                                                Loading staff metrics...
                                            </td>
                                        </tr>
                                    ) : !overview?.staff_stats || overview.staff_stats.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-8 text-center text-slate-400 text-[13px]">
                                                No calls recorded yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        overview.staff_stats.map((s, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                                                <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white flex items-center gap-2 text-[13px]">
                                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                                                        <User size={15} />
                                                    </div>
                                                    <span>{s.staff_name}</span>
                                                </td>
                                                <td className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300 text-[13px]">
                                                    {s.call_count} calls
                                                </td>
                                                <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400 text-[13px]">
                                                    {formatDuration(s.total_duration_seconds)}
                                                </td>
                                                <td className="px-5 py-3.5 text-right">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-[12px]">
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
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl p-3.5 rounded-xl border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <div className="relative w-full sm:w-80">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by phone or customer..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full pl-9 pr-4 py-2 text-[13px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end text-[13px] text-slate-500 font-medium">
                            <span>
                                Page <strong className="text-slate-800 dark:text-slate-200">{history?.page ?? 1}</strong> of <strong className="text-slate-800 dark:text-slate-200">{history?.pages ?? 1}</strong> ({history?.total ?? 0} total)
                            </span>
                            <button
                                onClick={fetchHistory}
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                title="Refresh"
                            >
                                <RefreshCw size={14} className={historyLoading ? "animate-spin" : ""} />
                            </button>
                        </div>
                    </div>

                    {/* Call History Table */}
                    <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl rounded-xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-xs">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs whitespace-nowrap">
                                <thead>
                                    <tr className="border-b border-slate-200/60 dark:border-white/5 bg-slate-50/75 dark:bg-slate-800/40 text-slate-400 uppercase tracking-wider text-[11px] font-bold">
                                        <th className="px-5 py-3">Date & Time</th>
                                        <th className="px-5 py-3">Staff Member</th>
                                        <th className="px-5 py-3">Customer</th>
                                        <th className="px-5 py-3">Queue</th>
                                        <th className="px-5 py-3">Actual Time</th>
                                        <th className="px-5 py-3 text-right">Billable</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-200 font-medium">
                                    {historyLoading ? (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center text-slate-400 text-[13px]">
                                                Loading call history...
                                            </td>
                                        </tr>
                                    ) : !history?.items || history.items.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center text-slate-400 text-[13px]">
                                                No calls found.
                                            </td>
                                        </tr>
                                    ) : (
                                        history.items.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                                                <td className="px-5 py-3.5 text-slate-500 text-[12px]">
                                                    {fmtDateTime(item.created_at, tz)}
                                                </td>
                                                <td className="px-5 py-3.5 font-bold text-slate-800 dark:text-slate-200 text-[13px]">
                                                    {item.called_by_name || "Staff Member"}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <div className="font-bold text-slate-900 dark:text-white text-[13px]">
                                                        {item.customer_phone}
                                                    </div>
                                                    {item.customer_name && (
                                                        <div className="text-[12px] text-slate-400">
                                                            {item.customer_name}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400 text-[13px]">
                                                    {item.queue_name || "—"}
                                                </td>
                                                <td className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300 text-[13px]">
                                                    {formatDuration(item.duration_seconds)}
                                                </td>
                                                <td className="px-5 py-3.5 text-right">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-[12px]">
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
                            <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/30">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-[13px] font-semibold disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                >
                                    <ChevronLeft size={14} /> Previous
                                </button>

                                <span className="text-[13px] font-medium text-slate-500">
                                    Page {page} of {history.pages}
                                </span>

                                <button
                                    onClick={() => setPage((p) => Math.min(history.pages, p + 1))}
                                    disabled={page >= history.pages}
                                    className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-[13px] font-semibold disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
