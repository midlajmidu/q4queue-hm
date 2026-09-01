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
    MessageSquareText,
    ShieldCheck,
    PhoneCall,
    PhoneIncoming,
    PhoneOff
} from "lucide-react";
import { toast } from "sonner";

interface CallLogsSectionProps {
    queueId?: string;
    isDark?: boolean;
    channel?: "whatsapp" | "calls";
    onChannelChange?: (channel: "whatsapp" | "calls") => void;
}

/* ─── Skeleton Shimmer Block ──────────────────────────── */
function Skeleton({ className = "" }: { className?: string }) {
    return <div className={`bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl ${className}`} />;
}

export function CallLogsSection({ queueId, channel = "calls", onChannelChange }: CallLogsSectionProps) {
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

    const tabs: Array<{
        id: "overview" | "history";
        label: string;
        icon: React.ElementType;
        count?: number;
    }> = [
        { id: "overview", label: "Telephony Overview", icon: BarChart3 },
        { id: "history", label: "Call History Logs", icon: ListFilter, count: history?.total }
    ];

    return (
        <div className="space-y-6 w-full pb-16 min-h-screen animate-in fade-in duration-300">
            {/* ══════════════════════════════════════════════
                1. EXECUTIVE UNIFIED HEADER & CHANNEL SWITCHER
            ══════════════════════════════════════════════ */}
            <div className="bg-white dark:bg-slate-900/70 dark:backdrop-blur-xl rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
                {/* Header Top Row: Title + Status + Channel Switcher */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3.5">
                        <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0 border border-indigo-100 dark:border-indigo-500/20 shadow-2xs">
                            <Phone size={26} strokeWidth={2.2} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                    Voice Calls & Telephony
                                </h1>
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/40">
                                    <span className="inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                    <span>Twilio / WebRTC • Operational</span>
                                </div>
                            </div>
                            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
                                Automated queue announcements, staff outgoing calls, and billable telephony minutes
                            </p>
                        </div>
                    </div>

                    {/* Channel Switcher (WhatsApp vs Calls) */}
                    {onChannelChange && (
                        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-white/5 self-start lg:self-auto shrink-0">
                            <button
                                onClick={() => onChannelChange("whatsapp")}
                                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[13px] font-bold transition-all cursor-pointer ${
                                    channel === "whatsapp"
                                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                }`}
                            >
                                <MessageSquareText size={15} />
                                <span>WhatsApp Studio</span>
                            </button>
                            <button
                                onClick={() => onChannelChange("calls")}
                                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[13px] font-bold transition-all cursor-pointer ${
                                    channel === "calls"
                                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                }`}
                            >
                                <Phone size={15} className="text-indigo-600 dark:text-indigo-400" />
                                <span>Voice Telephony</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Sub-Navigation Tabs */}
                <div className="flex items-center gap-1.5 border-t border-slate-100 dark:border-white/5 pt-4 overflow-x-auto">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = subTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setSubTab(tab.id)}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold transition-all cursor-pointer whitespace-nowrap ${isActive
                                    ? "bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-600 dark:hover:bg-indigo-500 shadow-xs"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
                                }`}
                            >
                                <Icon size={15} strokeWidth={isActive ? 2.5 : 2} />
                                <span>{tab.label}</span>
                                {typeof tab.count === "number" && tab.count > 0 && (
                                    <span className={`px-2 py-0.5 rounded-full text-[11px] tabular-nums font-extrabold ${isActive
                                        ? "bg-white/25 text-white"
                                        : "bg-slate-200/80 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300"
                                    }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ══════════════════════════════════════════════
                2. TAB: TELEPHONY OVERVIEW (UNIFIED METRIC RIBBON & STAFF STATS)
            ══════════════════════════════════════════════ */}
            {subTab === "overview" && (
                <div className="space-y-6">
                    {/* Unified Telephony Metric Ribbon */}
                    {overviewLoading ? (
                        <div className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-white/10 p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="space-y-2">
                                    <Skeleton className="h-3 w-20" />
                                    <Skeleton className="h-8 w-16" />
                                    <Skeleton className="h-2.5 w-24" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-900/70 dark:backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                            <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-white/5">
                                {/* 1. Total Calls */}
                                <div className="p-5 flex flex-col justify-between hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Calls</span>
                                        <Phone size={15} className="text-indigo-500" />
                                    </div>
                                    <div>
                                        <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                                            {overview?.total_calls ?? 0}
                                        </div>
                                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 block">WebRTC call attempts</span>
                                    </div>
                                </div>

                                {/* 2. Billable Minutes */}
                                <div className="p-5 flex flex-col justify-between hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Billable Usage</span>
                                        <CreditCard size={15} className="text-emerald-500" />
                                    </div>
                                    <div>
                                        <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight flex items-baseline gap-1.5">
                                            {overview?.total_billable_minutes ?? 0}
                                            <span className="text-xs font-bold uppercase text-emerald-500">Mins</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">
                                            <Info size={11} /> 60s increment rounded
                                        </div>
                                    </div>
                                </div>

                                {/* 3. Actual Talk Time */}
                                <div className="p-5 flex flex-col justify-between hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Talk Time</span>
                                        <Clock size={15} className="text-blue-500" />
                                    </div>
                                    <div>
                                        <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 tabular-nums tracking-tight">
                                            {formatDuration(overview?.total_duration_seconds ?? 0)}
                                        </div>
                                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 block">Cumulative duration</span>
                                    </div>
                                </div>

                                {/* 4. Avg Call Duration */}
                                <div className="p-5 flex flex-col justify-between hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Avg Duration</span>
                                        <TrendingUp size={15} className="text-amber-500" />
                                    </div>
                                    <div>
                                        <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 tabular-nums tracking-tight">
                                            {formatDuration(Math.round(overview?.avg_duration_seconds ?? 0))}
                                        </div>
                                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 block">Average per call</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Staff Call Breakdown Table */}
                    <div className="bg-white dark:bg-slate-900/70 dark:backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-xs">
                        <div className="px-5 sm:px-6 py-4 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-slate-50/40 dark:bg-slate-800/20">
                            <div>
                                <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">
                                    Staff Call Activity & Billable Minutes
                                </h3>
                                <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    Aggregated calling metrics per staff agent
                                </p>
                            </div>
                            <button
                                onClick={fetchOverview}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-200/60 dark:border-white/5"
                                title="Refresh data"
                            >
                                <RefreshCw size={14} className={overviewLoading ? "animate-spin" : ""} />
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs whitespace-nowrap">
                                <thead className="bg-slate-50/75 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider font-bold border-b border-slate-200/60 dark:border-white/5">
                                    <tr>
                                        <th className="px-5 sm:px-6 py-3.5">Staff Member</th>
                                        <th className="px-5 py-3.5">Total Calls</th>
                                        <th className="px-5 py-3.5">Actual Duration</th>
                                        <th className="px-5 sm:px-6 py-3.5 text-right">Billable Mins</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-200 font-medium">
                                    {overviewLoading ? (
                                        <tr>
                                            <td colSpan={4} className="py-12 text-center">
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <RefreshCw size={20} className="animate-spin text-indigo-500" />
                                                    <p className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">Loading staff metrics...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : !overview?.staff_stats || overview.staff_stats.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-5 py-16 text-center">
                                                <div className="flex flex-col items-center justify-center gap-3">
                                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                        <PhoneCall size={22} className="text-slate-300 dark:text-slate-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[13px] font-bold text-slate-700 dark:text-slate-300">No calls recorded yet</p>
                                                        <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-0.5">Staff calls made via WebRTC will appear here automatically.</p>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        overview.staff_stats.map((s, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/75 dark:hover:bg-white/[0.02] transition-colors">
                                                <td className="px-5 sm:px-6 py-3.5 font-bold text-slate-900 dark:text-white flex items-center gap-3 text-[13px]">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-[11px] border border-indigo-200/70 dark:border-indigo-800/40">
                                                        {(s.staff_name || "S").substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <span>{s.staff_name}</span>
                                                </td>
                                                <td className="px-5 py-3.5 font-semibold text-slate-700 dark:text-slate-300 text-[13px]">
                                                    {s.call_count} calls
                                                </td>
                                                <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400 text-[13px]">
                                                    {formatDuration(s.total_duration_seconds)}
                                                </td>
                                                <td className="px-5 sm:px-6 py-3.5 text-right">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/50 text-[12px]">
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

            {/* ══════════════════════════════════════════════
                3. TAB: CALL HISTORY LOGS
            ══════════════════════════════════════════════ */}
            {subTab === "history" && (
                <div className="bg-white dark:bg-slate-900/70 dark:backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-xs space-y-0">
                    {/* Search & Status Toolbar */}
                    <div className="p-4 border-b border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/40 dark:bg-slate-800/20">
                        <div className="relative w-full sm:w-80">
                            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by phone or customer name..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full h-10 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 rounded-xl pl-9 pr-4 text-[13px] font-medium text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
                            />
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end text-[12px] text-slate-500 dark:text-slate-400 font-medium">
                            <span>
                                Page <strong className="text-slate-900 dark:text-white">{history?.page ?? 1}</strong> of <strong className="text-slate-900 dark:text-white">{history?.pages ?? 1}</strong> (<strong className="text-slate-900 dark:text-white">{history?.total ?? 0}</strong> total)
                            </span>
                            <button
                                onClick={fetchHistory}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border border-slate-200/60 dark:border-white/5"
                                title="Refresh"
                            >
                                <RefreshCw size={14} className={historyLoading ? "animate-spin" : ""} />
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                            <thead className="bg-slate-50/75 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider font-bold border-b border-slate-200/60 dark:border-white/5">
                                <tr>
                                    <th className="px-5 sm:px-6 py-3.5">Date & Time</th>
                                    <th className="px-5 py-3.5">Staff Caller</th>
                                    <th className="px-5 py-3.5">Customer</th>
                                    <th className="px-5 py-3.5">Queue</th>
                                    <th className="px-5 py-3.5">Actual Time</th>
                                    <th className="px-5 sm:px-6 py-3.5 text-right">Billable</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-200 font-medium">
                                {historyLoading ? (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <RefreshCw size={20} className="animate-spin text-indigo-500" />
                                                <p className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">Loading call history...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : !history?.items || history.items.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-16 text-center">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                    <PhoneOff size={22} className="text-slate-300 dark:text-slate-600" />
                                                </div>
                                                <div>
                                                    <p className="text-[13px] font-bold text-slate-700 dark:text-slate-300">No call logs found</p>
                                                    <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-0.5">Try searching for a different number or clear your search query.</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    history.items.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50/75 dark:hover:bg-white/[0.02] transition-colors">
                                            <td className="px-5 sm:px-6 py-3.5 text-slate-500 dark:text-slate-400 text-[12px]">
                                                {fmtDateTime(item.created_at, tz)}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800/40">
                                                        {(item.called_by_name || "S").substring(0, 1).toUpperCase()}
                                                    </div>
                                                    <span className="font-bold text-slate-900 dark:text-white text-[13px]">
                                                        {item.called_by_name || "Staff Member"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="font-bold font-mono text-slate-900 dark:text-white text-[13px]">
                                                    {item.customer_phone}
                                                </div>
                                                {item.customer_name && (
                                                    <div className="text-[11px] text-slate-400">
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
                                            <td className="px-5 sm:px-6 py-3.5 text-right">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/50 text-[12px]">
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
                        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-850">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-[12px] font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            >
                                <ChevronLeft size={14} /> Previous
                            </button>

                            <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300">
                                Page {page} of {history.pages}
                            </span>

                            <button
                                onClick={() => setPage((p) => Math.min(history.pages, p + 1))}
                                disabled={page >= history.pages}
                                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-[12px] font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            >
                                Next <ChevronRight size={14} />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
