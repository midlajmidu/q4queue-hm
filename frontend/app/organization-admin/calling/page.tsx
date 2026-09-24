"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import type {
    ParentOrgCallingOverviewResponse,
    PaginatedParentOrgCallLogsResponse,
    ParentOrgBranchCallingStat,
    ParentOrgCallLogItem,
} from "@/types/api";
import {
    Phone,
    PhoneCall,
    PhoneIncoming,
    Clock,
    CreditCard,
    TrendingUp,
    Building2,
    Calendar,
    Download,
    RefreshCw,
    Search,
    ChevronLeft,
    ChevronRight,
    X,
    Filter,
    Layers,
    ListFilter,
    CheckCircle2,
    XCircle,
    Eye,
    EyeOff,
} from "lucide-react";
import { toast } from "sonner";

function formatDuration(seconds: number): string {
    if (!seconds || seconds <= 0) return "0s";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    if (secs === 0) return `${mins}m`;
    return `${mins}m ${secs}s`;
}

function maskPhone(phone?: string | null): string {
    if (!phone) return "—";
    const clean = phone.trim();
    if (clean.length <= 4) return clean;
    const start = clean.slice(0, 3);
    const end = clean.slice(-2);
    return `${start}••••${end}`;
}

export default function OrgAdminCallingPage() {
    // Sub-tab
    const [subTab, setSubTab] = useState<"branches" | "logs">("branches");

    // Overview state
    const [data, setData] = useState<ParentOrgCallingOverviewResponse | null>(null);
    const [loading, setLoading] = useState(true);

    // Filters
    const [datePreset, setDatePreset] = useState<"all" | "today" | "7d" | "30d">("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [selectedBranchId, setSelectedBranchId] = useState<string>("");

    // Logs state
    const [logsData, setLogsData] = useState<PaginatedParentOrgCallLogsResponse | null>(null);
    const [logsLoading, setLogsLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [maskPhones, setMaskPhones] = useState(true);
    const [exporting, setExporting] = useState(false);

    // Date Preset Handler
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

    // Load Overview Data
    const loadOverview = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.getParentOrgCallingOverview({
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                branchId: selectedBranchId || undefined,
            });
            setData(res);
        } catch (err: any) {
            toast.error(err?.message || "Failed to load calling overview");
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, selectedBranchId]);

    // Load Logs Data
    const loadLogs = useCallback(async () => {
        if (subTab !== "logs") return;
        setLogsLoading(true);
        try {
            const res = await api.getParentOrgCallingLogs({
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                branchId: selectedBranchId || undefined,
                search: search.trim() || undefined,
                page,
                limit: 15,
            });
            setLogsData(res);
        } catch (err: any) {
            toast.error(err?.message || "Failed to load call logs");
        } finally {
            setLogsLoading(false);
        }
    }, [subTab, startDate, endDate, selectedBranchId, search, page]);

    useEffect(() => {
        loadOverview();
    }, [loadOverview]);

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    // Live real-time call update listeners
    useEffect(() => {
        const handleLivelyRefresh = () => {
            loadOverview();
            if (subTab === "logs") {
                loadLogs();
            }
        };

        window.addEventListener("plivo_call_hung_up", handleLivelyRefresh);
        window.addEventListener("call_record_updated", handleLivelyRefresh);

        // Auto-refresh every 8s while page is visible
        const timer = setInterval(() => {
            if (typeof document !== "undefined" && document.visibilityState === "visible") {
                handleLivelyRefresh();
            }
        }, 8000);

        return () => {
            window.removeEventListener("plivo_call_hung_up", handleLivelyRefresh);
            window.removeEventListener("call_record_updated", handleLivelyRefresh);
            clearInterval(timer);
        };
    }, [loadOverview, loadLogs, subTab]);

    // Export CSV
    const handleExport = async () => {
        setExporting(true);
        try {
            const blob = await api.exportParentOrgCallingCSV({
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                branchId: selectedBranchId || undefined,
                search: search.trim() || undefined,
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `organization_calling_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            toast.success("Call records exported successfully");
        } catch {
            toast.error("Failed to export calling data");
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto py-2 px-4 sm:px-6 lg:px-8 pb-16">
            {/* ── 1. Hero Header Banner ── */}
            <div className="bg-white dark:bg-slate-900/60 rounded-3xl p-6 sm:p-8 shadow-xs border border-slate-200/80 dark:border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
                                <Phone size={20} />
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                Voice Calling & Telephony
                            </h1>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
                            Enterprise overview, cross-branch calling minutes, per-minute pricing breakdown, and live call telemetry.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            type="button"
                            onClick={handleExport}
                            disabled={exporting}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                        >
                            <Download size={14} className={exporting ? "animate-bounce" : ""} />
                            <span>{exporting ? "Exporting..." : "Export CSV"}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                loadOverview();
                                if (subTab === "logs") loadLogs();
                            }}
                            className="p-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-2xs transition-all cursor-pointer"
                            title="Refresh data"
                        >
                            <RefreshCw size={15} className={loading || logsLoading ? "animate-spin text-indigo-600" : ""} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── 2. Filter Bar (Date Presets, Custom Range, Branch Dropdown) ── */}
            <div className="bg-white dark:bg-slate-900/60 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Quick Date Presets */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/60 dark:border-white/5">
                        {(["all", "today", "7d", "30d"] as const).map((p) => {
                            const labels: Record<string, string> = {
                                all: "All Time",
                                today: "Today",
                                "7d": "7 Days",
                                "30d": "30 Days",
                            };
                            const isSelected = datePreset === p;
                            return (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => handleDatePreset(p)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                        isSelected
                                            ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                                            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                                    }`}
                                >
                                    {labels[p]}
                                </button>
                            );
                        })}
                    </div>

                    {/* Custom Date Range */}
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-white/5">
                        <Calendar size={14} className="text-slate-400" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value);
                                setDatePreset("all");
                                setPage(1);
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
                                setPage(1);
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
                                title="Clear dates"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Branch Dropdown Filter */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-white/5">
                        <Building2 size={14} className="text-slate-400" />
                        <select
                            value={selectedBranchId}
                            onChange={(e) => {
                                setSelectedBranchId(e.target.value);
                                setPage(1);
                            }}
                            className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                        >
                            <option value="">All Branches</option>
                            {data?.branches.map((b) => (
                                <option key={b.branch_id} value={b.branch_id}>
                                    {b.branch_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {(selectedBranchId || startDate || endDate) && (
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedBranchId("");
                                setStartDate("");
                                setEndDate("");
                                setDatePreset("all");
                            }}
                            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline px-2 cursor-pointer"
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {/* ── 3. High-Level Metric Cards Grid (6 Cards) ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                {/* 1. Total Calls */}
                <div className="bg-white dark:bg-slate-900/60 rounded-2xl p-4.5 border border-slate-200/80 dark:border-white/10 shadow-xs flex items-center justify-between">
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Calls</p>
                        <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
                            {data?.total_calls ?? 0}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">WebRTC attempts</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center shrink-0">
                        <Phone size={18} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                </div>

                {/* 2. Connection Rate */}
                <div className="bg-white dark:bg-slate-900/60 rounded-2xl p-4.5 border border-slate-200/80 dark:border-white/10 shadow-xs flex items-center justify-between">
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Connection Rate</p>
                        <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
                            {data?.connection_rate ?? 0}%
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Calls answered</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center shrink-0">
                        <PhoneIncoming size={18} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                </div>

                {/* 3. Billable Minutes */}
                <div className="bg-white dark:bg-slate-900/60 rounded-2xl p-4.5 border border-slate-200/80 dark:border-white/10 shadow-xs flex items-center justify-between">
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Billable Minutes</p>
                        <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
                            {data?.total_billable_minutes ?? 0} <span className="text-xs font-semibold text-slate-400">mins</span>
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">60s pulse rounded</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center shrink-0">
                        <CreditCard size={18} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                </div>

                {/* 4. Total Amount Spent (Prominently Highlighted) */}
                <div className="bg-white dark:bg-slate-900/60 rounded-2xl p-4.5 border border-emerald-200/80 dark:border-emerald-500/20 shadow-xs flex items-center justify-between bg-gradient-to-br from-white to-emerald-50/25 dark:from-slate-900/60 dark:to-emerald-950/15">
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Spend</p>
                        <p className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">
                            {data?.currency || "₹"}{(data?.total_amount ?? 0).toFixed(2)}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Across branches</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-100/80 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center shrink-0">
                        <CreditCard size={18} className="text-emerald-700 dark:text-emerald-400" />
                    </div>
                </div>

                {/* 5. Talk Time */}
                <div className="bg-white dark:bg-slate-900/60 rounded-2xl p-4.5 border border-slate-200/80 dark:border-white/10 shadow-xs flex items-center justify-between">
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Talk Time</p>
                        <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
                            {formatDuration(data?.total_duration_seconds ?? 0)}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Cumulative</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center shrink-0">
                        <Clock size={18} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                </div>

                {/* 6. Avg Duration */}
                <div className="bg-white dark:bg-slate-900/60 rounded-2xl p-4.5 border border-slate-200/80 dark:border-white/10 shadow-xs flex items-center justify-between">
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Avg Duration</p>
                        <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1">
                            {formatDuration(Math.round(data?.avg_duration_seconds ?? 0))}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Per call avg</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center shrink-0">
                        <TrendingUp size={18} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                </div>
            </div>

            {/* ── 4. Sub-Navigation Tabs ── */}
            <div className="border-b border-slate-200/80 dark:border-white/10">
                <div className="flex items-center gap-6">
                    <button
                        type="button"
                        onClick={() => setSubTab("branches")}
                        className={`flex items-center gap-2 pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                            subTab === "branches"
                                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                        }`}
                    >
                        <Building2 size={16} />
                        <span>Branch Breakdown & Pricing</span>
                        {data?.branches && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {data.branches.length}
                            </span>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => setSubTab("logs")}
                        className={`flex items-center gap-2 pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                            subTab === "logs"
                                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                        }`}
                    >
                        <ListFilter size={16} />
                        <span>Call Logs Telemetry</span>
                        {logsData?.total !== undefined && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {logsData.total}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* ── Tab 1: Branch Breakdown & Pricing Table ── */}
            {subTab === "branches" && (
                <div className="bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">Branch Telephony Breakdown</h2>
                            <p className="text-xs text-slate-400 mt-0.5">Calls, talk durations, billable minutes, and total pricing per branch.</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[750px]">
                            <thead>
                                <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    <th className="px-6 py-3.5">Branch</th>
                                    <th className="px-6 py-3.5">Call Rate</th>
                                    <th className="px-6 py-3.5">Total Calls</th>
                                    <th className="px-6 py-3.5">Connection Rate</th>
                                    <th className="px-6 py-3.5">Talk Time</th>
                                    <th className="px-6 py-3.5">Billable Mins</th>
                                    <th className="px-6 py-3.5 text-right">Total Amount</th>
                                    <th className="px-6 py-3.5 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {(!data?.branches || data.branches.length === 0) ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-slate-400 text-sm">
                                            No branches found or no call activity in this timeframe.
                                        </td>
                                    </tr>
                                ) : (
                                    data.branches.map((b) => {
                                        const isSelected = selectedBranchId === b.branch_id;
                                        return (
                                            <tr
                                                key={b.branch_id}
                                                className={`hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors ${
                                                    isSelected ? "bg-indigo-50/40 dark:bg-indigo-950/20" : ""
                                                }`}
                                            >
                                                {/* Branch Info */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100/80 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs shrink-0">
                                                            {b.branch_name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-sm text-slate-900 dark:text-white">
                                                                {b.branch_name}
                                                            </div>
                                                            <div className="text-[11px] text-slate-400">/{b.branch_slug}</div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Rate */}
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                                                        {b.currency}{b.rate_per_minute.toFixed(2)}/min
                                                    </span>
                                                </td>

                                                {/* Total Calls */}
                                                <td className="px-6 py-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                                    {b.total_calls}
                                                </td>

                                                {/* Connection Rate */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-emerald-500 rounded-full"
                                                                style={{ width: `${Math.min(b.connection_rate, 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                            {b.connection_rate}%
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Talk Time */}
                                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                                    {formatDuration(b.total_duration_seconds)}
                                                </td>

                                                {/* Billable Minutes */}
                                                <td className="px-6 py-4 text-sm font-bold text-slate-800 dark:text-slate-200">
                                                    {b.total_billable_minutes} mins
                                                </td>

                                                {/* Total Amount */}
                                                <td className="px-6 py-4 text-right font-black text-sm text-emerald-600 dark:text-emerald-400">
                                                    {b.currency}{b.total_amount.toFixed(2)}
                                                </td>

                                                {/* Action */}
                                                <td className="px-6 py-4 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedBranchId(b.branch_id);
                                                            setSubTab("logs");
                                                        }}
                                                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline cursor-pointer"
                                                    >
                                                        View Logs &rarr;
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Tab 2: Call Logs Telemetry Table ── */}
            {subTab === "logs" && (
                <div className="bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden space-y-4">
                    {/* Search & Actions Bar */}
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-4">
                        <div className="relative flex-1 min-w-[240px] max-w-md">
                            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by customer phone or name..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full h-10 pl-9 pr-4 text-xs font-medium bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white"
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setMaskPhones(!maskPhones)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                            >
                                {maskPhones ? <EyeOff size={14} /> : <Eye size={14} />}
                                <span>{maskPhones ? "Unmask Phone" : "Mask Phone"}</span>
                            </button>
                        </div>
                    </div>

                    {/* Logs Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[850px]">
                            <thead>
                                <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    <th className="px-6 py-3.5">Time</th>
                                    <th className="px-6 py-3.5">Branch</th>
                                    <th className="px-6 py-3.5">Staff Caller</th>
                                    <th className="px-6 py-3.5">Customer</th>
                                    <th className="px-6 py-3.5">Status</th>
                                    <th className="px-6 py-3.5">Talk Time</th>
                                    <th className="px-6 py-3.5">Ring Time</th>
                                    <th className="px-6 py-3.5">Billable</th>
                                    <th className="px-6 py-3.5 text-right">Cost</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {logsLoading ? (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-12 text-center text-slate-400 text-sm">
                                            Loading call telemetry...
                                        </td>
                                    </tr>
                                ) : (!logsData?.items || logsData.items.length === 0) ? (
                                    <tr>
                                        <td colSpan={9} className="px-6 py-12 text-center text-slate-400 text-sm">
                                            No call records matching your criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    logsData.items.map((log) => {
                                        const isAnswered = log.call_status === "completed" || log.duration_seconds > 0;
                                        return (
                                            <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors">
                                                {/* Time */}
                                                <td className="px-6 py-4 text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                                    {log.created_at ? new Date(log.created_at).toLocaleString() : "—"}
                                                </td>

                                                {/* Branch */}
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100/80 dark:border-indigo-500/20">
                                                        {log.branch_name}
                                                    </span>
                                                </td>

                                                {/* Staff */}
                                                <td className="px-6 py-4 text-xs font-bold text-slate-800 dark:text-slate-200">
                                                    {log.called_by_name || "Staff Member"}
                                                </td>

                                                {/* Customer */}
                                                <td className="px-6 py-4">
                                                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                                        {maskPhones ? maskPhone(log.customer_phone) : (log.customer_phone || "—")}
                                                    </div>
                                                    {log.customer_name && (
                                                        <div className="text-[11px] text-slate-400">{log.customer_name}</div>
                                                    )}
                                                </td>

                                                {/* Status */}
                                                <td className="px-6 py-4">
                                                    {isAnswered ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-500/20">
                                                            <CheckCircle2 size={12} />
                                                            Answered
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200/80 dark:border-rose-500/20">
                                                            <XCircle size={12} />
                                                            {log.call_status === "no_answer" ? "No Answer" : (log.call_status || "Missed")}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Talk Time */}
                                                <td className="px-6 py-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                                                    {formatDuration(log.duration_seconds)}
                                                </td>

                                                {/* Ring Time */}
                                                <td className="px-6 py-4 text-xs text-slate-400">
                                                    {log.ring_duration_seconds ? `${log.ring_duration_seconds}s` : "0s"}
                                                </td>

                                                {/* Billable Minutes */}
                                                <td className="px-6 py-4 text-xs font-bold text-slate-800 dark:text-slate-200">
                                                    {log.billable_minutes} mins
                                                </td>

                                                {/* Cost */}
                                                <td className="px-6 py-4 text-right font-black text-xs text-emerald-600 dark:text-emerald-400">
                                                    {log.currency || "₹"}{(log.cost_amount ?? 0).toFixed(2)}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {logsData && logsData.pages > 1 && (
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                            <span className="text-xs text-slate-400">
                                Showing page <span className="font-bold text-slate-700 dark:text-slate-300">{logsData.page}</span> of{" "}
                                <span className="font-bold text-slate-700 dark:text-slate-300">{logsData.pages}</span> ({logsData.total} total)
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={logsData.page <= 1}
                                    className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPage((p) => Math.min(logsData.pages, p + 1))}
                                    disabled={logsData.page >= logsData.pages}
                                    className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-500 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
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
