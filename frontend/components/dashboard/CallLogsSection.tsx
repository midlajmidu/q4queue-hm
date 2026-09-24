"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { useBranchTimezone } from "@/context/BranchTimezoneContext";
import { fmtDateTime, fmtDate, fmtTime, nowInTz } from "@/lib/tzformat";
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
    PhoneIncoming,
    PhoneMissed,
    X,
    Download,
    Eye,
    EyeOff,
    Calendar,
    CheckCircle2
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

/* ─── Pagination Number Generator ──────────────────────────── */
function getPaginationPages(currentPage: number, totalPages: number): (number | "...")[] {
    if (totalPages <= 5) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 3) {
        return [1, 2, 3, 4, "...", totalPages];
    }
    if (currentPage >= totalPages - 2) {
        return [1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
}

/* ─── Phone Number Masking ──────────────────────────── */
function maskPhone(phone: string): string {
    if (!phone || phone.length < 6) return phone;
    // Keep first 4 chars and last 3, mask the rest
    const prefix = phone.slice(0, 4);
    const suffix = phone.slice(-3);
    const masked = "****";
    return `${prefix} ${masked}${suffix}`;
}

/* ─── Call Status Badge ──────────────────────────── */
function CallStatusBadge({ status }: { status: string }) {
    switch (status) {
        case "completed":
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/40">
                    <CheckCircle2 size={12} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>Answered</span>
                </span>
            );
        case "no_answer":
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/40">
                    <PhoneMissed size={12} className="shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>No Answer</span>
                </span>
            );
        case "busy":
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/70 dark:border-rose-800/40">
                    <PhoneOff size={12} className="shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>Busy</span>
                </span>
            );
        case "failed":
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200/70 dark:border-red-800/40">
                    <PhoneOff size={12} className="shrink-0 text-red-600 dark:text-red-400" />
                    <span>Failed</span>
                </span>
            );
        case "cancelled":
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/70 dark:border-slate-700/50">
                    <X size={12} className="shrink-0 text-slate-500 dark:text-slate-400" />
                    <span>Cancelled</span>
                </span>
            );
        default:
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/40">
                    <CheckCircle2 size={12} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>Answered</span>
                </span>
            );
    }
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
    const [limit, setLimit] = useState(10);

    // P0: Date range filtering
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [datePreset, setDatePreset] = useState<"all" | "today" | "7d" | "30d">("all");

    // P0: Phone number masking
    const [phoneMasked, setPhoneMasked] = useState(true);

    // P0: Export state
    const [exporting, setExporting] = useState(false);

    const handleDatePreset = (preset: "all" | "today" | "7d" | "30d") => {
        setDatePreset(preset);
        setPage(1);
        const now = new Date();
        const toYMD = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
        };

        if (preset === "all") {
            setStartDate("");
            setEndDate("");
        } else if (preset === "today") {
            const todayStr = toYMD(now);
            setStartDate(todayStr);
            setEndDate(todayStr);
        } else if (preset === "7d") {
            const past = new Date(now);
            past.setDate(past.getDate() - 7);
            setStartDate(toYMD(past));
            setEndDate(toYMD(now));
        } else if (preset === "30d") {
            const past = new Date(now);
            past.setDate(past.getDate() - 30);
            setStartDate(toYMD(past));
            setEndDate(toYMD(now));
        }
    };

    // Reset page on filter changes
    useEffect(() => {
        setPage(1);
    }, [startDate, endDate, search, limit]);



    const fetchOverview = useCallback(async () => {
        setOverviewLoading(true);
        try {
            const res = await api.getCallLogsOverview(queueId, startDate || undefined, endDate || undefined);
            setOverview(res);
        } catch {
            toast.error("Failed to load call logs overview");
        } finally {
            setOverviewLoading(false);
        }
    }, [queueId, startDate, endDate]);

    const fetchHistory = useCallback(async () => {
        setHistoryLoading(true);
        try {
            const res = await api.getCallLogs({
                queue_id: queueId,
                search: search ? search.trim() : undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                page,
                limit,
                start_date: startDate || undefined,
                end_date: endDate || undefined,
            });
            setHistory(res);
        } catch {
            toast.error("Failed to load call log history");
        } finally {
            setHistoryLoading(false);
        }
    }, [queueId, search, startDate, endDate, page, limit]);

    useEffect(() => {
        setPage(1);
    }, [startDate, endDate, search]);

    useEffect(() => {
        if (subTab === "overview") {
            fetchOverview();
        } else {
            fetchHistory();
        }
    }, [subTab, fetchOverview, fetchHistory]);

    const handleExportCSV = async () => {
        setExporting(true);
        try {
            const blob = await api.exportCallLogsCSV({
                queue_id: queueId,
                search: search || undefined,
                start_date: startDate || undefined,
                end_date: endDate || undefined,
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `call_logs_export_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success("Call logs exported successfully");
        } catch {
            toast.error("Failed to export call logs");
        } finally {
            setExporting(false);
        }
    };

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

    const hasActiveFilters = Boolean(startDate || endDate);

    return (
        <div className="space-y-6 w-full pb-6 animate-in fade-in duration-300">
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

            {/* ── 3. Overview Tab: 6 Metric Cards & Staff Breakdown Table ── */}
            {subTab === "overview" && (
                <div className="space-y-6">
                    {/* Date Presets & Custom Filter for Overview */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-white/5 shrink-0 overflow-x-auto self-start w-fit">
                            {(["all", "today", "7d", "30d"] as const).map((p) => {
                                const labels: Record<string, string> = {
                                    all: "All Time",
                                    today: "Today",
                                    "7d": "7 Days",
                                    "30d": "30 Days"
                                };
                                const isSelected = datePreset === p;
                                return (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => handleDatePreset(p)}
                                        className={`px-3 py-1.5 text-[12px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                                            isSelected
                                                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                                                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                                        }`}
                                    >
                                        {labels[p]}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Custom Date Range */}
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-white/5">
                                <Calendar size={14} className="text-slate-400" />
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => {
                                        setStartDate(e.target.value);
                                        setDatePreset("all");
                                    }}
                                    className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-200 outline-none"
                                />
                                <span className="text-slate-400 text-xs">to</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => {
                                        setEndDate(e.target.value);
                                        setDatePreset("all");
                                    }}
                                    className="bg-transparent text-xs font-medium text-slate-700 dark:text-slate-200 outline-none"
                                />
                                {(startDate || endDate) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setStartDate("");
                                            setEndDate("");
                                            setDatePreset("all");
                                        }}
                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-1 p-0.5"
                                        title="Clear date filter"
                                    >
                                        <X size={13} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 6-Column Stat Cards Grid */}
                    {overviewLoading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                            {Array.from({ length: 6 }).map((_, i) => (
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
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                            {/* 1. Total Calls */}
                            <div className="bg-white dark:bg-slate-900/70 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs p-4 flex items-center justify-between">
                                <div className="min-w-0">
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Calls</p>
                                    <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                                        {overview?.total_calls ?? 0}
                                    </p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">WebRTC attempts</p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-indigo-50/80 dark:bg-indigo-500/10 border border-indigo-100/80 dark:border-indigo-500/20 flex items-center justify-center shrink-0">
                                    <Phone size={18} className="text-indigo-600 dark:text-indigo-400" />
                                </div>
                            </div>

                            {/* 2. Connection Rate */}
                            <div className="bg-white dark:bg-slate-900/70 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs p-4.5 flex items-center justify-between">
                                <div className="min-w-0">
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Connection Rate</p>
                                    <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                                        {overview?.connection_rate ?? 0}%
                                    </p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Calls answered</p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-emerald-50/80 dark:bg-emerald-500/10 border border-emerald-100/80 dark:border-emerald-500/20 flex items-center justify-center shrink-0">
                                    <PhoneIncoming size={18} className="text-emerald-600 dark:text-emerald-400" />
                                </div>
                            </div>

                            {/* 3. Billable Minutes */}
                            <div className="bg-white dark:bg-slate-900/70 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs p-4.5 flex items-center justify-between">
                                <div className="min-w-0">
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Billable Minutes</p>
                                    <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                                        {overview?.total_billable_minutes ?? 0} <span className="text-sm font-semibold text-slate-500">mins</span>
                                    </p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">60s rounded</p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-indigo-50/80 dark:bg-indigo-500/10 border border-indigo-100/80 dark:border-indigo-500/20 flex items-center justify-center shrink-0">
                                    <CreditCard size={18} className="text-indigo-600 dark:text-indigo-400" />
                                </div>
                            </div>

                            {/* 4. Total Amount / Total Spend (Requested by user) */}
                            <div className="bg-white dark:bg-slate-900/70 rounded-2xl border border-emerald-200/80 dark:border-emerald-500/20 shadow-xs p-4.5 flex items-center justify-between bg-gradient-to-br from-white to-emerald-50/20 dark:from-slate-900/70 dark:to-emerald-950/10">
                                <div className="min-w-0">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Spend</p>
                                    <p className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">
                                        {overview?.currency || "₹"}{(overview?.total_amount ?? ((overview?.total_billable_minutes ?? 0) * (overview?.rate_per_minute ?? 1.5))).toFixed(2)}
                                    </p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        Rate: {overview?.currency || "₹"}{overview?.rate_per_minute ?? 1.50}/min
                                    </p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-emerald-100/80 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center shrink-0">
                                    <CreditCard size={18} className="text-emerald-700 dark:text-emerald-400" />
                                </div>
                            </div>

                            {/* 5. Talk Time */}
                            <div className="bg-white dark:bg-slate-900/70 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs p-4.5 flex items-center justify-between">
                                <div className="min-w-0">
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Talk Time</p>
                                    <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                                        {formatDuration(overview?.total_duration_seconds ?? 0)}
                                    </p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Cumulative</p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-indigo-50/80 dark:bg-indigo-500/10 border border-indigo-100/80 dark:border-indigo-500/20 flex items-center justify-center shrink-0">
                                    <Clock size={18} className="text-indigo-600 dark:text-indigo-400" />
                                </div>
                            </div>

                            {/* 6. Avg Duration */}
                            <div className="bg-white dark:bg-slate-900/70 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs p-4.5 flex items-center justify-between">
                                <div className="min-w-0">
                                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Avg Duration</p>
                                    <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
                                        {formatDuration(Math.round(overview?.avg_duration_seconds ?? 0))}
                                    </p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Answered calls avg</p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-indigo-50/80 dark:bg-indigo-500/10 border border-indigo-100/80 dark:border-indigo-500/20 flex items-center justify-center shrink-0">
                                    <TrendingUp size={18} className="text-indigo-600 dark:text-indigo-400" />
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
                                                <div className="flex justify-between items-center py-0.5 border-t border-slate-100/60 dark:border-white/5 pt-1.5">
                                                    <span className="text-slate-500 font-medium">Total Cost</span>
                                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                                        {overview?.currency || "₹"}{(s.total_cost_amount ?? (s.total_billable_minutes * (overview?.rate_per_minute || 1.5))).toFixed(2)}
                                                    </span>
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
                                        <th className="px-6 py-3.5">Billable</th>
                                        <th className="px-6 py-3.5 text-right">Total Cost</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {overviewLoading ? (
                                        <tr>
                                            <td colSpan={5} className="py-16 text-center text-slate-400 text-xs">
                                                <RefreshCw size={18} className="animate-spin text-indigo-500 mx-auto mb-2" />
                                                Loading staff metrics...
                                            </td>
                                        </tr>
                                    ) : !overview?.staff_stats || overview.staff_stats.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-20 text-center">
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
                                                    <td className="px-6 py-3.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                        {s.total_billable_minutes} mins
                                                    </td>
                                                    <td className="px-6 py-3.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 text-right">
                                                        {overview?.currency || "₹"}{(s.total_cost_amount ?? (s.total_billable_minutes * (overview?.rate_per_minute || 1.5))).toFixed(2)}
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

            {/* ── 4. Call History Tab: Table Card with Filters, Search, Export & Masking ── */}
            {subTab === "history" && (
                <div className="bg-white dark:bg-slate-900/70 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
                    {/* Header Bar with Search, Filters & Actions */}
                    <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 space-y-4">
                        {/* Row 1: Title + Actions */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center shrink-0">
                                    <ListFilter size={16} className="text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Call History Logs</h2>
                                    <p className="text-xs text-slate-400 mt-0.5">{history?.total ?? 0} total calls recorded</p>
                                </div>
                            </div>

                            {/* Actions: Mask Toggle, Export, Refresh */}
                            <div className="flex items-center gap-2 shrink-0">
                                {/* Phone Masking Toggle */}
                                <button
                                    type="button"
                                    onClick={() => setPhoneMasked(!phoneMasked)}
                                    title={phoneMasked ? "Show full phone numbers" : "Mask phone numbers"}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                >
                                    {phoneMasked ? <EyeOff size={13} /> : <Eye size={13} />}
                                    <span className="hidden sm:inline">{phoneMasked ? "Masked" : "Visible"}</span>
                                </button>

                                {/* Export CSV */}
                                <button
                                    type="button"
                                    onClick={handleExportCSV}
                                    disabled={exporting}
                                    title="Export call logs as CSV"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                    <Download size={13} className={exporting ? "animate-bounce" : ""} />
                                    <span className="hidden sm:inline">{exporting ? "Exporting..." : "Export CSV"}</span>
                                </button>

                                {/* Refresh */}
                                <button
                                    type="button"
                                    onClick={fetchHistory}
                                    disabled={historyLoading}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                                >
                                    <RefreshCw size={13} className={historyLoading ? "animate-spin" : ""} />
                                </button>
                            </div>
                        </div>

                        {/* Row 2: Date Presets + Search */}
                        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                            {/* Date Presets */}
                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-white/5 shrink-0 overflow-x-auto">
                                {(["all", "today", "7d", "30d"] as const).map((p) => {
                                    const labels: Record<string, string> = {
                                        all: "All Time",
                                        today: "Today",
                                        "7d": "7 Days",
                                        "30d": "30 Days"
                                    };
                                    const isSelected = datePreset === p;
                                    return (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => handleDatePreset(p)}
                                            className={`px-3 py-1.5 text-[12px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                                                isSelected
                                                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                                            }`}
                                        >
                                            {labels[p]}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Custom Date + Search */}
                            <div className="flex items-center gap-2.5 flex-wrap flex-1 justify-start lg:justify-end">
                                <div className="flex items-center gap-2 bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 transition-all">
                                    <Calendar size={13} className="text-slate-400 shrink-0" />
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={e => { setStartDate(e.target.value); setDatePreset("all"); }}
                                        className="text-[12px] font-semibold text-slate-800 dark:text-slate-200 bg-transparent outline-none w-[105px]"
                                    />
                                    <span className="text-slate-300 dark:text-slate-600">→</span>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={e => { setEndDate(e.target.value); setDatePreset("all"); }}
                                        className="text-[12px] font-semibold text-slate-800 dark:text-slate-200 bg-transparent outline-none w-[105px]"
                                    />
                                </div>

                                <div className="relative w-full sm:w-56">
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
                            </div>
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
                                <p className="text-xs text-slate-400 mt-1">Try adjusting the date range or search query.</p>
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
                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                <CallStatusBadge status={item.call_status || "completed"} />
                                                <div className="text-right">
                                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 block">
                                                        {item.billable_minutes} min{item.billable_minutes !== 1 ? "s" : ""}
                                                    </span>
                                                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block">
                                                        {overview?.currency || "₹"}{(item.cost_amount ?? (item.billable_minutes * (overview?.rate_per_minute || 1.5))).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-2 bg-slate-50/50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-100 dark:border-white/5 text-xs">
                                            <div className="flex justify-between items-center py-0.5">
                                                <span className="text-slate-500 font-medium">Customer</span>
                                                <div className="text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <span className="font-semibold text-slate-900 dark:text-white">{phoneMasked ? maskPhone(item.customer_phone) : item.customer_phone}</span>
                                                        {item.booking_reference && (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40">
                                                                <Calendar size={9} /> #{item.booking_reference}
                                                            </span>
                                                        )}
                                                    </div>
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
                                                <div className="text-right">
                                                    <span className="font-semibold text-slate-900 dark:text-white">{formatDuration(item.duration_seconds)}</span>
                                                    {Boolean(item.ring_duration_seconds && item.ring_duration_seconds > 0) && (
                                                        <span className="block text-[11px] text-slate-400 dark:text-slate-500">Ring: {formatDuration(item.ring_duration_seconds || 0)}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center py-0.5 border-t border-slate-100/60 dark:border-white/5 pt-1.5">
                                                <span className="text-slate-500 font-medium">Billable</span>
                                                <span className="font-semibold text-slate-700 dark:text-slate-200">{item.billable_minutes} min{item.billable_minutes !== 1 ? "s" : ""}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1050px]">
                            <thead>
                                <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-white/5 text-[11px] uppercase tracking-widest text-slate-400 font-semibold">
                                    <th className="px-6 py-3.5 whitespace-nowrap w-[170px]">Date & Time</th>
                                    <th className="px-6 py-3.5 whitespace-nowrap w-[180px]">Staff Caller</th>
                                    <th className="px-6 py-3.5 whitespace-nowrap w-[190px]">Customer</th>
                                    <th className="px-6 py-3.5 whitespace-nowrap w-[150px]">Queue</th>
                                    <th className="px-6 py-3.5 whitespace-nowrap w-[140px]">Status</th>
                                    <th className="px-6 py-3.5 whitespace-nowrap w-[120px]">Duration</th>
                                    <th className="px-6 py-3.5 whitespace-nowrap w-[100px]">Billable</th>
                                    <th className="px-6 py-3.5 whitespace-nowrap w-[100px] text-right">Cost</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {historyLoading ? (
                                    <tr>
                                        <td colSpan={8} className="py-16 text-center text-slate-400 text-xs">
                                            <RefreshCw size={18} className="animate-spin text-indigo-500 mx-auto mb-2" />
                                            Loading call history...
                                        </td>
                                    </tr>
                                ) : !history?.items || history.items.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-20 text-center">
                                            <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-white/5 flex items-center justify-center mx-auto mb-3">
                                                <PhoneOff size={22} className="text-slate-300 dark:text-slate-600" />
                                            </div>
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No call logs found</p>
                                            <p className="text-xs text-slate-400 mt-1">Try adjusting the date range or search query.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    history.items.map((item) => {
                                        const staffDisplay = getStaffDisplayName(item.called_by_name);
                                        const avatarBg = avatarColors[staffDisplay.charCodeAt(0) % avatarColors.length];
                                        return (
                                            <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-medium text-slate-900 dark:text-white text-xs">{fmtDate(item.created_at, tz)}</div>
                                                    <div className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums mt-0.5">{fmtTime(item.created_at, tz)}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className={`w-7 h-7 rounded-full ${avatarBg} text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm`}>
                                                            {getStaffInitial(item.called_by_name)}
                                                        </div>
                                                        <span className="font-semibold text-slate-900 dark:text-white text-sm truncate max-w-[150px]">
                                                            {staffDisplay}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <p className="font-semibold text-slate-900 dark:text-white text-sm tabular-nums">
                                                                {phoneMasked ? maskPhone(item.customer_phone) : item.customer_phone}
                                                            </p>
                                                            {item.booking_reference && (
                                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40" title={`Appointment #${item.booking_reference}`}>
                                                                    <Calendar size={10} /> #{item.booking_reference}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {item.customer_name && (
                                                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[160px]">{item.customer_name}</p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 max-w-[150px] truncate border border-slate-200/50 dark:border-slate-700/50">
                                                        {item.queue_name || "General"}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <CallStatusBadge status={item.call_status || "completed"} />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-semibold text-slate-900 dark:text-white text-sm tabular-nums">{formatDuration(item.duration_seconds)}</div>
                                                    {Boolean(item.ring_duration_seconds && item.ring_duration_seconds > 0) && (
                                                        <div className="text-[11px] text-slate-400 dark:text-slate-500 font-normal tabular-nums mt-0.5">
                                                            Ring: {formatDuration(item.ring_duration_seconds || 0)}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap tabular-nums">
                                                    {item.billable_minutes} min{item.billable_minutes !== 1 ? "s" : ""}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-semibold text-emerald-600 dark:text-emerald-400 text-right whitespace-nowrap tabular-nums">
                                                    {overview?.currency || "₹"}{(item.cost_amount ?? (item.billable_minutes * (overview?.rate_per_minute || 1.5))).toFixed(2)}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    {history && history.total > 0 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/40 dark:bg-slate-900/40">
                            {/* Showing X to Y of Z & Rows per page */}
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                <span>
                                    Showing <span className="font-semibold text-slate-900 dark:text-white">{((page - 1) * limit) + 1}</span> to{" "}
                                    <span className="font-semibold text-slate-900 dark:text-white">{Math.min(page * limit, history.total)}</span> of{" "}
                                    <span className="font-semibold text-slate-900 dark:text-white">{history.total}</span> calls
                                </span>

                                <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200 dark:border-white/10">
                                    <span className="text-slate-400">Per page:</span>
                                    <select
                                        value={limit}
                                        onChange={(e) => {
                                            setLimit(Number(e.target.value));
                                            setPage(1);
                                        }}
                                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-2xs"
                                    >
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </select>
                                </div>
                            </div>

                            {/* Pagination Controls */}
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1 || historyLoading}
                                    title="Previous Page"
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
                                >
                                    <ChevronLeft size={14} />
                                    <span className="hidden sm:inline">Previous</span>
                                </button>

                                <div className="flex items-center gap-1">
                                    {getPaginationPages(page, Math.max(1, history.pages || Math.ceil(history.total / limit))).map((p, idx) =>
                                        p === "..." ? (
                                            <span key={`ellipsis-${idx}`} className="px-1.5 text-xs text-slate-400 font-bold">
                                                …
                                            </span>
                                        ) : (
                                            <button
                                                key={`page-${p}`}
                                                type="button"
                                                onClick={() => setPage(Number(p))}
                                                disabled={historyLoading}
                                                className={`min-w-[32px] h-8 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                                    page === p
                                                        ? "bg-indigo-600 text-white shadow-xs"
                                                        : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                                                }`}
                                            >
                                                {p}
                                            </button>
                                        )
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        const totalPages = Math.max(1, history.pages || Math.ceil(history.total / limit));
                                        setPage((p) => Math.min(totalPages, p + 1));
                                    }}
                                    disabled={page >= (history.pages || Math.ceil(history.total / limit)) || historyLoading}
                                    title="Next Page"
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
                                >
                                    <span className="hidden sm:inline">Next</span>
                                    <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
