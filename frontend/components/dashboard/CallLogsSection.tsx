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
    RefreshCw,
    BarChart3,
    ListFilter,
    MessageSquareText,
    PhoneCall,
    PhoneOff,
    X
} from "lucide-react";
import { toast } from "sonner";

interface CallLogsSectionProps {
    queueId?: string;
    isDark?: boolean;
    channel?: "whatsapp" | "calls";
    onChannelChange?: (channel: "whatsapp" | "calls") => void;
}

const avatarColors = [
    "bg-indigo-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-sky-500",
    "bg-violet-500",
    "bg-pink-500",
    "bg-teal-500"
];

function getStaffDisplayName(name?: string | null): string {
    if (!name) return "Staff Member";
    if (name.includes("@")) {
        return name.split("@")[0];
    }
    return name;
}

function getStaffInitial(name?: string | null): string {
    const displayName = getStaffDisplayName(name);
    return (displayName.charAt(0) || "S").toUpperCase();
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
            {/* ── 1. Header & Channel Switcher (Matches Staff Monitoring) ── */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 pb-6 border-b border-slate-200/60 dark:border-white/10">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-slate-200 dark:to-slate-400">
                        Voice Calls & Telephony
                    </h1>
                    <div className="flex items-center flex-wrap gap-2.5 text-sm text-slate-500 dark:text-slate-400 mt-2">
                        <span className="leading-none font-medium">
                            Automated queue announcements, staff outgoing calls, and billable telephony minutes
                        </span>
                    </div>
                </div>

                {/* Channel Switcher (WhatsApp vs Calls) */}
                {onChannelChange && (
                    <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-white/5 shrink-0 self-start lg:self-auto">
                        <button
                            type="button"
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
                            type="button"
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

            {/* ── 2. Standard Underline Sub-Navigation Tabs ── */}
            <div className="border-b border-slate-200/80 dark:border-white/10">
                <div className="flex items-center gap-6 overflow-x-auto">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = subTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setSubTab(tab.id)}
                                className={`flex items-center gap-2 pb-3 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap border-b-2 -mb-px ${
                                    isActive
                                        ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                                        : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                                }`}
                            >
                                <Icon size={16} />
                                <span>{tab.label}</span>
                                {typeof tab.count === "number" && tab.count > 0 && (
                                    <span className={`px-2 py-0.5 rounded-full text-[11px] tabular-nums font-bold ${
                                        isActive
                                            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                    }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── 3. Overview Tab: 4 Metric Cards & Staff Breakdown Table ── */}
            {subTab === "overview" && (
                <div className="space-y-6">
                    {/* 4-Column Stat Cards Grid (2x2 on Mobile) */}
                    {overviewLoading ? (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="bg-white dark:bg-slate-900/70 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs p-4.5 flex items-center justify-between">
                                    <div className="space-y-2 min-w-0">
                                        <Skeleton className="h-3 w-20" />
                                        <Skeleton className="h-7 w-16" />
                                        <Skeleton className="h-2.5 w-24" />
                                    </div>
                                    <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* 1. Total Calls */}
                            <div className="bg-white dark:bg-slate-900/70 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs p-4.5 flex items-center justify-between">
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Total Calls
                                    </p>
                                    <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                                        {overview?.total_calls ?? 0}
                                    </p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">WebRTC attempts</p>
                                </div>
                                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100/80 dark:border-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400">
                                    <Phone size={18} />
                                </div>
                            </div>

                            {/* 2. Billable Minutes */}
                            <div className="bg-white dark:bg-slate-900/70 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs p-4.5 flex items-center justify-between">
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Billable Minutes
                                    </p>
                                    <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                                        {overview?.total_billable_minutes ?? 0} <span className="text-sm font-semibold text-slate-500">mins</span>
                                    </p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">60s rounded</p>
                                </div>
                                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100/80 dark:border-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400">
                                    <CreditCard size={18} />
                                </div>
                            </div>

                            {/* 3. Talk Time */}
                            <div className="bg-white dark:bg-slate-900/70 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs p-4.5 flex items-center justify-between">
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Talk Time
                                    </p>
                                    <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                                        {formatDuration(overview?.total_duration_seconds ?? 0)}
                                    </p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Cumulative</p>
                                </div>
                                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100/80 dark:border-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400">
                                    <Clock size={18} />
                                </div>
                            </div>

                            {/* 4. Avg Duration */}
                            <div className="bg-white dark:bg-slate-900/70 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs p-4.5 flex items-center justify-between">
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        Avg Duration
                                    </p>
                                    <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                                        {formatDuration(Math.round(overview?.avg_duration_seconds ?? 0))}
                                    </p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Per call avg</p>
                                </div>
                                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100/80 dark:border-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-400">
                                    <TrendingUp size={18} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Staff Call Breakdown Card */}
                    <div className="bg-white dark:bg-slate-900/70 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
                        {/* Header Bar */}
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center shrink-0">
                                    <PhoneCall size={16} className="text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Staff Call Breakdown</h2>
                                    <p className="text-xs text-slate-400 mt-0.5">Aggregated calling metrics per staff agent</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={fetchOverview}
                                disabled={overviewLoading}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                <RefreshCw size={13} className={overviewLoading ? "animate-spin" : ""} />
                                <span>{overviewLoading ? "Refreshing..." : "Refresh"}</span>
                            </button>
                        </div>

                        {/* Mobile View */}
                        <div className="block md:hidden divide-y divide-slate-100 dark:divide-white/5 bg-white dark:bg-slate-900">
                            {overviewLoading ? (
                                <div className="p-12 text-center text-slate-400 text-xs font-medium">
                                    <RefreshCw size={18} className="animate-spin text-indigo-500 mx-auto mb-2" />
                                    Loading staff metrics...
                                </div>
                            ) : !overview?.staff_stats || overview.staff_stats.length === 0 ? (
                                <div className="p-12 text-center">
                                    <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-white/5 flex items-center justify-center mx-auto mb-3">
                                        <PhoneCall size={22} className="text-slate-300 dark:text-slate-600" />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No staff calls recorded</p>
                                    <p className="text-xs text-slate-400 mt-1">Staff calls made via WebRTC will appear here.</p>
                                </div>
                            ) : (
                                overview.staff_stats.map((s, idx) => {
                                    const displayName = getStaffDisplayName(s.staff_name);
                                    const avatarBg = avatarColors[displayName.charCodeAt(0) % avatarColors.length];
                                    return (
                                        <div key={idx} className="p-4 space-y-3 hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full ${avatarBg} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                                                    {getStaffInitial(s.staff_name)}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-semibold text-slate-900 dark:text-white text-sm leading-snug truncate">
                                                        {displayName}
                                                    </h4>
                                                    <p className="text-[11px] text-slate-400">{s.call_count} call{s.call_count !== 1 ? "s" : ""}</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 gap-2 bg-slate-50/50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-100 dark:border-white/5 text-xs">
                                                <div className="flex justify-between items-center py-0.5">
                                                    <span className="text-slate-500 font-medium">Actual Duration</span>
                                                    <span className="font-semibold text-slate-900 dark:text-white">{formatDuration(s.total_duration_seconds)}</span>
                                                </div>
                                                <div className="flex justify-between items-center py-0.5 border-t border-slate-100/60 dark:border-white/5 pt-1.5">
                                                    <span className="text-slate-500 font-medium">Billable</span>
                                                    <span className="font-semibold text-slate-700 dark:text-slate-200">{s.total_billable_minutes} mins</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[700px]">
                                <thead>
                                    <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-white/5 text-[11px] uppercase tracking-widest text-slate-400 font-semibold">
                                        <th className="px-6 py-3.5">Staff Member</th>
                                        <th className="px-6 py-3.5">Total Calls</th>
                                        <th className="px-6 py-3.5">Actual Duration</th>
                                        <th className="px-6 py-3.5 text-right">Billable</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {overviewLoading ? (
                                        <tr>
                                            <td colSpan={4} className="py-16 text-center text-slate-400 text-xs">
                                                <RefreshCw size={18} className="animate-spin text-indigo-500 mx-auto mb-2" />
                                                Loading staff metrics...
                                            </td>
                                        </tr>
                                    ) : !overview?.staff_stats || overview.staff_stats.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="py-20 text-center">
                                                <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-white/5 flex items-center justify-center mx-auto mb-3">
                                                    <PhoneCall size={22} className="text-slate-300 dark:text-slate-600" />
                                                </div>
                                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No staff calls recorded</p>
                                                <p className="text-xs text-slate-400 mt-1">Staff calls made via WebRTC will appear here.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        overview.staff_stats.map((s, idx) => {
                                            const displayName = getStaffDisplayName(s.staff_name);
                                            const avatarBg = avatarColors[displayName.charCodeAt(0) % avatarColors.length];
                                            return (
                                                <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                                                    <td className="px-6 py-3.5">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className={`w-8 h-8 rounded-full ${avatarBg} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                                                                {getStaffInitial(s.staff_name)}
                                                            </div>
                                                            <span className="font-semibold text-slate-900 dark:text-white text-sm">
                                                                {displayName}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3.5 text-sm text-slate-600 dark:text-slate-300 font-medium">
                                                        {s.call_count} call{s.call_count !== 1 ? "s" : ""}
                                                    </td>
                                                    <td className="px-6 py-3.5 text-sm text-slate-500 dark:text-slate-400">
                                                        {formatDuration(s.total_duration_seconds)}
                                                    </td>
                                                    <td className="px-6 py-3.5 text-sm font-semibold text-slate-700 dark:text-slate-200 text-right">
                                                        {s.total_billable_minutes} mins
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ── 4. Call History Tab: Table Card with Search & Pagination ── */}
            {subTab === "history" && (
                <div className="bg-white dark:bg-slate-900/70 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
                    {/* Header Bar with Search */}
                    <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center shrink-0">
                                <ListFilter size={16} className="text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Call History Logs</h2>
                                <p className="text-xs text-slate-400 mt-0.5">{history?.total ?? 0} total calls recorded</p>
                            </div>
                        </div>

                        {/* Search & Actions */}
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="relative w-full sm:w-64">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search calls..."
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setPage(1);
                                    }}
                                    className="w-full h-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-8 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-400 transition-all"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => { setSearch(""); setPage(1); }}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                    >
                                        <X size={13} />
                                    </button>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={fetchHistory}
                                disabled={historyLoading}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                            >
                                <RefreshCw size={13} className={historyLoading ? "animate-spin" : ""} />
                                <span className="hidden sm:inline">{historyLoading ? "Refreshing..." : "Refresh"}</span>
                            </button>
                        </div>
                    </div>

                    {/* Mobile View */}
                    <div className="block md:hidden divide-y divide-slate-100 dark:divide-white/5 bg-white dark:bg-slate-900">
                        {historyLoading ? (
                            <div className="p-12 text-center text-slate-400 text-xs font-medium">
                                <RefreshCw size={18} className="animate-spin text-indigo-500 mx-auto mb-2" />
                                Loading call history...
                            </div>
                        ) : !history?.items || history.items.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-white/5 flex items-center justify-center mx-auto mb-3">
                                    <PhoneOff size={22} className="text-slate-300 dark:text-slate-600" />
                                </div>
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No call logs found</p>
                                <p className="text-xs text-slate-400 mt-1">Try searching for a different number or customer name.</p>
                            </div>
                        ) : (
                            history.items.map((item) => {
                                const staffDisplay = getStaffDisplayName(item.called_by_name);
                                const avatarBg = avatarColors[staffDisplay.charCodeAt(0) % avatarColors.length];
                                return (
                                    <div key={item.id} className="p-4 space-y-3 hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className={`w-8 h-8 rounded-full ${avatarBg} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                                                    {getStaffInitial(item.called_by_name)}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="font-semibold text-slate-900 dark:text-white text-sm leading-snug truncate">
                                                        {staffDisplay}
                                                    </h4>
                                                    <p className="text-[11px] text-slate-400">{fmtDateTime(item.created_at, tz)}</p>
                                                </div>
                                            </div>
                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 shrink-0">
                                                {item.billable_minutes} min{item.billable_minutes !== 1 ? "s" : ""}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 gap-2 bg-slate-50/50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-100 dark:border-white/5 text-xs">
                                            <div className="flex justify-between items-center py-0.5">
                                                <span className="text-slate-500 font-medium">Customer</span>
                                                <div className="text-right">
                                                    <span className="font-semibold text-slate-900 dark:text-white">{item.customer_phone}</span>
                                                    {item.customer_name && (
                                                        <p className="text-[11px] text-slate-400">{item.customer_name}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center py-0.5 border-t border-slate-100/60 dark:border-white/5 pt-1.5">
                                                <span className="text-slate-500 font-medium">Queue</span>
                                                <span className="font-semibold text-slate-700 dark:text-slate-300">{item.queue_name || "—"}</span>
                                            </div>
                                            <div className="flex justify-between items-center py-0.5 border-t border-slate-100/60 dark:border-white/5 pt-1.5">
                                                <span className="text-slate-500 font-medium">Duration</span>
                                                <span className="font-semibold text-slate-900 dark:text-white">{formatDuration(item.duration_seconds)}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-white/5 text-[11px] uppercase tracking-widest text-slate-400 font-semibold">
                                    <th className="px-6 py-3.5">Date & Time</th>
                                    <th className="px-6 py-3.5">Staff</th>
                                    <th className="px-6 py-3.5">Customer</th>
                                    <th className="px-6 py-3.5">Queue</th>
                                    <th className="px-6 py-3.5">Duration</th>
                                    <th className="px-6 py-3.5 text-right">Billable</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {historyLoading ? (
                                    <tr>
                                        <td colSpan={6} className="py-16 text-center text-slate-400 text-xs">
                                            <RefreshCw size={18} className="animate-spin text-indigo-500 mx-auto mb-2" />
                                            Loading call history...
                                        </td>
                                    </tr>
                                ) : !history?.items || history.items.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-20 text-center">
                                            <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-white/5 flex items-center justify-center mx-auto mb-3">
                                                <PhoneOff size={22} className="text-slate-300 dark:text-slate-600" />
                                            </div>
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No call logs found</p>
                                            <p className="text-xs text-slate-400 mt-1">Try searching for a different number or customer name.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    history.items.map((item) => {
                                        const staffDisplay = getStaffDisplayName(item.called_by_name);
                                        const avatarBg = avatarColors[staffDisplay.charCodeAt(0) % avatarColors.length];
                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-3.5 text-sm text-slate-500 dark:text-slate-400">
                                                    {fmtDateTime(item.created_at, tz)}
                                                </td>
                                                <td className="px-6 py-3.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={`w-8 h-8 rounded-full ${avatarBg} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                                                            {getStaffInitial(item.called_by_name)}
                                                        </div>
                                                        <span className="font-semibold text-slate-900 dark:text-white text-sm">
                                                            {staffDisplay}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3.5">
                                                    <div>
                                                        <p className="font-semibold text-slate-900 dark:text-white text-sm">{item.customer_phone}</p>
                                                        {item.customer_name && (
                                                            <p className="text-xs text-slate-400 mt-0.5">{item.customer_name}</p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3.5 text-sm font-medium text-slate-600 dark:text-slate-300">
                                                    {item.queue_name || "—"}
                                                </td>
                                                <td className="px-6 py-3.5 text-sm text-slate-500 dark:text-slate-400">
                                                    {formatDuration(item.duration_seconds)}
                                                </td>
                                                <td className="px-6 py-3.5 text-sm font-semibold text-slate-700 dark:text-slate-200 text-right">
                                                    {item.billable_minutes} min{item.billable_minutes !== 1 ? "s" : ""}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    {history && history.pages > 1 && (
                        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900">
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                Showing <span className="font-semibold text-slate-900 dark:text-white">{((page - 1) * limit) + 1}</span> to <span className="font-semibold text-slate-900 dark:text-white">{Math.min(page * limit, history.total)}</span> of <span className="font-semibold text-slate-900 dark:text-white">{history.total}</span> call logs
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <div className="px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                    Page {page} of {history.pages}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.min(history.pages, p + 1))}
                                    disabled={page >= history.pages}
                                    className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
