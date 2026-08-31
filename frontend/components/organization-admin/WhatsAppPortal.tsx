"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import type {
    WhatsAppOrgConfig,
    WhatsAppOrgStats,
    PaginatedWhatsAppMessages,
    WhatsAppMessage,
    WhatsAppEventStat,
    QueueResponse,
} from "@/types/api";
import {
    MessageSquareText,
    Settings,
    Calendar,
    ChevronDown,
    FilterX,
    Send,
    CheckCircle2,
    Eye,
    AlertTriangle,
    TrendingUp,
    BarChart3,
    Clock,
    Check,
    CheckCheck,
    XCircle,
    BellRing,
    Search,
    X,
    Phone,
    User,
    Sparkles,
    ShieldCheck,
    ChevronRight,
    Copy,
    Info,
    RotateCcw
} from "lucide-react";
import { useBranchTimezone } from "@/context/BranchTimezoneContext";
import { fmtDateTime, fmtTime as fmtTimeTz, nowInTz } from "@/lib/tzformat";

const EVENT_LABEL: Record<string, string> = {
    "queue_joined_v4": "Joined Queue",
    "queue_nearby_5_v3": "Position 5 Warning",
    "queue_nearby_3_v3": "Position 3 Warning",
    "queue_called_v3": "Called to Counter",
    "queue_completed_v3": "Completed",
    "queue_skipped_v3": "Skipped",
    "queue_removed_v3": "Removed",
    "queue_recalled_v2": "Recalled",

    // Legacy Events mapping
    "queue_nearby_5_v2": "Position 5 Warning",
    "queue_nearby_3_v2": "Position 3 Warning",
    "queue_called_v2": "Called to Counter",
    "queue_completed_v2": "Completed",
    "queue_skipped_v2": "Skipped",
    "queue_removed_v2": "Removed",
    "queue_joined_v2": "Joined Queue",
    "queue_position_v2": "Position Warning",
    "queue_served_v2": "Called to Counter",
    "test": "Test Notification",
};

const ACTIVE_EVENTS = [
    "queue_joined_v4",
    "queue_nearby_5_v3",
    "queue_nearby_3_v3",
    "queue_called_v3",
    "queue_completed_v3",
    "queue_skipped_v3",
    "queue_removed_v3",
    "queue_recalled_v2",
];

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case "delivered":
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                    <CheckCheck size={12} className="text-emerald-500" />
                    <span>Delivered</span>
                </span>
            );
        case "read":
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40">
                    <Eye size={12} className="text-blue-500" />
                    <span>Read</span>
                </span>
            );
        case "sent":
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/40">
                    <Check size={12} className="text-sky-500" />
                    <span>Sent</span>
                </span>
            );
        case "pending":
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
                    <Clock size={12} className="text-amber-500" />
                    <span>Pending</span>
                </span>
            );
        case "failed":
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40">
                    <AlertTriangle size={12} className="text-rose-500" />
                    <span>Failed</span>
                </span>
            );
        case "skipped":
        default:
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/50">
                    <span>Skipped</span>
                </span>
            );
    }
}

export function WhatsAppPortal() {
    const tz = useBranchTimezone();
    const [activeTab, setActiveTab] = useState<"overview" | "history" | "settings">("overview");

    const [config, setConfig] = useState<WhatsAppOrgConfig | null>(null);
    const [stats, setStats] = useState<WhatsAppOrgStats | null>(null);
    const [eventStats, setEventStats] = useState<WhatsAppEventStat[]>([]);
    const [logs, setLogs] = useState<PaginatedWhatsAppMessages | null>(null);
    const [selectedMessage, setSelectedMessage] = useState<WhatsAppMessage | null>(null);
    const [queues, setQueues] = useState<QueueResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [copiedPayload, setCopiedPayload] = useState(false);

    // Filters
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [filterQueueId, setFilterQueueId] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterEventType, setFilterEventType] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [datePreset, setDatePreset] = useState<"all" | "today" | "7d" | "30d">("all");

    // Settings state
    const [testPhone, setTestPhone] = useState("");
    const [sendingTest, setSendingTest] = useState(false);
    const [testMsg, setTestMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [updatingSettings, setUpdatingSettings] = useState(false);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 400);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Reset pagination on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [startDate, endDate, filterQueueId, filterStatus, filterEventType, debouncedSearchQuery]);

    const handleDatePreset = (preset: "all" | "today" | "7d" | "30d") => {
        setDatePreset(preset);
        const now = nowInTz(tz);
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
            past.setDate(past.getDate() - 6);
            setStartDate(toYMD(past));
            setEndDate(toYMD(now));
        } else if (preset === "30d") {
            const past = new Date(now);
            past.setDate(past.getDate() - 29);
            setStartDate(toYMD(past));
            setEndDate(toYMD(now));
        }
    };

    const loadInitialData = useCallback(async () => {
        try {
            const [cfg, qs] = await Promise.all([
                api.getOrgWhatsAppConfig().catch(() => null),
                api.listQueues().catch(() => []),
            ]);
            if (cfg) setConfig(cfg);
            setQueues(qs || []);
        } catch (e) {
            console.error("Failed to load initial data", e);
        }
    }, []);

    const loadFilteredData = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                queueId: filterQueueId || undefined,
            };

            const historyParams = {
                ...params,
                status: filterStatus || undefined,
                eventType: filterEventType || undefined,
                customerPhone: debouncedSearchQuery && /^[0-9+ \-]+$/.test(debouncedSearchQuery) ? debouncedSearchQuery : undefined,
                customerName: debouncedSearchQuery && !/^[0-9+ \-]+$/.test(debouncedSearchQuery) ? debouncedSearchQuery : undefined,
                limit: 50,
                offset: (currentPage - 1) * 50,
            };

            const [st, events, history] = await Promise.all([
                api.getOrgWhatsAppStats(params).catch(() => null),
                api.getOrgWhatsAppEventStats(params).catch(() => []),
                api.getOrgWhatsAppMessages(historyParams).catch(() => null),
            ]);
            if (st) setStats(st);
            setEventStats(events || []);
            if (history) setLogs(history);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, filterQueueId, filterStatus, filterEventType, debouncedSearchQuery, currentPage]);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    useEffect(() => {
        loadFilteredData();
    }, [loadFilteredData]);

    const allEventsToDisplay = useMemo(() => {
        const aggregated: Record<string, WhatsAppEventStat> = {};

        ACTIVE_EVENTS.forEach(eventKey => {
            const label = EVENT_LABEL[eventKey] || eventKey;
            aggregated[label] = {
                event_type: eventKey,
                total: 0,
                delivered: 0,
                read: 0,
                failed: 0,
                success_rate: 0
            };
        });

        eventStats.forEach(stat => {
            const label = EVENT_LABEL[stat.event_type] || stat.event_type;
            if (!aggregated[label]) {
                aggregated[label] = { ...stat, event_type: stat.event_type };
            } else {
                aggregated[label].total += stat.total;
                aggregated[label].delivered += stat.delivered;
                aggregated[label].read += stat.read;
                aggregated[label].failed += stat.failed;

                const tot = aggregated[label].total;
                aggregated[label].success_rate = tot > 0 ? Math.round((aggregated[label].delivered / tot) * 100) : 0;
            }
        });

        return Object.values(aggregated);
    }, [eventStats]);

    const handleSettingChange = async (key: keyof WhatsAppOrgConfig, value: boolean) => {
        if (!config) return;
        const previousConfig = { ...config };
        setConfig({ ...config, [key]: value });
        try {
            await api.setOrgWhatsAppEnabled({ [key]: value });
        } catch {
            setConfig(previousConfig);
        }
    };

    const handleEnableAll = async (enabled: boolean) => {
        if (!config) return;
        const updated = {
            notify_queue_joined: enabled,
            notify_position_5: enabled,
            notify_position_3: enabled,
            notify_called: enabled,
            notify_completed: enabled,
            notify_skipped: enabled,
            notify_recalled: enabled,
            notify_removed: enabled,
        };
        const previousConfig = { ...config };
        setConfig({ ...config, ...updated });
        setUpdatingSettings(true);
        try {
            await api.setOrgWhatsAppEnabled(updated);
        } catch {
            setConfig(previousConfig);
        } finally {
            setUpdatingSettings(false);
        }
    };

    const sendTest = async () => {
        const cleaned = testPhone.trim();
        if (!cleaned || !cleaned.startsWith("+") || cleaned.length < 8) {
            setTestMsg({ type: "error", text: "Please enter a valid E.164 phone number with country code (e.g. +919876543210)" });
            return;
        }
        setSendingTest(true);
        setTestMsg(null);
        try {
            await api.sendWhatsAppTestNotification(cleaned);
            setTestMsg({ type: "success", text: "Test message queued successfully! Check WhatsApp on the recipient device." });
            setTimeout(() => {
                loadFilteredData();
            }, 1500);
        } catch (err: any) {
            setTestMsg({ type: "error", text: err?.message || "Failed to send test message. Check Meta Cloud API credentials." });
        } finally {
            setSendingTest(false);
        }
    };

    const copyPayloadToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedPayload(true);
        setTimeout(() => setCopiedPayload(false), 2000);
    };

    const tabs: Array<{
        id: "overview" | "history" | "settings";
        label: string;
        icon: React.ElementType;
        count?: number;
    }> = [
        { id: "overview", label: "Overview", icon: BarChart3 },
        { id: "history", label: "Message Logs", icon: MessageSquareText, count: logs?.total },
        { id: "settings", label: "Notification Settings", icon: Settings }
    ];

    return (
        <div className="space-y-6 w-full pb-16 min-h-screen">
            {/* ══════════════════════════════════════════════
                1. UNIFIED SLEEK TOP BAR
            ══════════════════════════════════════════════ */}
            <div className="bg-white dark:bg-slate-900/70 dark:backdrop-blur-xl rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-500/20 shrink-0">
                        <MessageSquareText size={22} strokeWidth={2.2} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                WhatsApp & Communications
                            </h1>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/40 shadow-2xs">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span>Connected</span>
                            </div>
                        </div>
                        <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1 font-normal">
                            Live message analytics, delivery logs, and automated customer event triggers
                        </p>
                    </div>
                </div>

                {/* Segmented Pill Tab Switcher */}
                <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-white/5 self-start sm:self-auto shrink-0 overflow-x-auto">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold transition-all cursor-pointer whitespace-nowrap ${isActive
                                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                }`}
                            >
                                <Icon size={15} strokeWidth={isActive ? 2.5 : 2} />
                                <span>{tab.label}</span>
                                {typeof tab.count === "number" && tab.count > 0 && (
                                    <span className={`px-1.5 py-0.2 rounded-md text-[11px] tabular-nums font-semibold ${isActive
                                        ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                        : "bg-slate-200/70 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400"
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
                2. TAB CONTENT
            ══════════════════════════════════════════════ */}
            {activeTab === "overview" && (
                <div className="space-y-6">
                    {/* Compact Filter Toolbar */}
                    <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl p-3.5 sm:p-4 rounded-xl shadow-xs border border-slate-200/80 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
                        {/* Quick Presets */}
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200/60 dark:border-white/5">
                            {(["all", "today", "7d", "30d"] as const).map((p) => {
                                const labels: Record<string, string> = {
                                    all: "All Time",
                                    today: "Today",
                                    "7d": "7 Days",
                                    "30d": "30 Days"
                                };
                                const isSelected = datePreset === p && (!startDate && !endDate && p === "all" || p !== "all");
                                return (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => handleDatePreset(p)}
                                        className={`px-3 py-1.5 text-[13px] font-semibold rounded-md transition-all cursor-pointer ${isSelected
                                            ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                                            : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                                        }`}
                                    >
                                        {labels[p]}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Date Pickers & Queue Selector */}
                        <div className="flex items-center gap-2.5 flex-wrap flex-1 justify-end">
                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5">
                                <Calendar size={14} className="text-slate-400" />
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={e => { setStartDate(e.target.value); setDatePreset("all"); }}
                                    className="bg-transparent text-[13px] font-medium text-slate-800 dark:text-slate-200 outline-none w-32"
                                    placeholder="Start Date"
                                />
                                <span className="text-slate-300 dark:text-slate-600 text-[13px]">→</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={e => { setEndDate(e.target.value); setDatePreset("all"); }}
                                    className="bg-transparent text-[13px] font-medium text-slate-800 dark:text-slate-200 outline-none w-32"
                                    placeholder="End Date"
                                />
                            </div>

                            <div className="relative">
                                <select
                                    value={filterQueueId}
                                    onChange={e => setFilterQueueId(e.target.value)}
                                    className="h-9 pl-3 pr-8 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-lg text-[13px] font-medium text-slate-800 dark:text-slate-200 outline-none appearance-none cursor-pointer"
                                >
                                    <option value="">All Queues</option>
                                    {queues.map(q => (
                                        <option key={q.id} value={q.id}>{q.name}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>

                            {(startDate || endDate || filterQueueId) && (
                                <button
                                    onClick={() => { setStartDate(""); setEndDate(""); setFilterQueueId(""); setDatePreset("all"); }}
                                    className="h-9 px-3 flex items-center gap-1.5 text-[13px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-lg transition-colors cursor-pointer"
                                >
                                    <FilterX size={14} />
                                    <span>Reset</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 5 KPI Metric Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                        <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl rounded-xl border border-slate-200/80 dark:border-white/10 p-4 sm:p-4.5 shadow-2xs flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">Total Sent</span>
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                    <Send size={15} strokeWidth={2.5} />
                                </div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight">
                                    {stats?.total ?? 0}
                                </div>
                                <span className="text-[12px] font-medium text-slate-400 dark:text-slate-500">Outbound notifications</span>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl rounded-xl border border-slate-200/80 dark:border-white/10 p-4 sm:p-4.5 shadow-2xs flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">Delivered</span>
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                    <CheckCircle2 size={15} strokeWidth={2.5} />
                                </div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">
                                    {stats?.delivered ?? 0}
                                </div>
                                <span className="text-[12px] font-medium text-slate-400 dark:text-slate-500">Received by devices</span>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl rounded-xl border border-slate-200/80 dark:border-white/10 p-4 sm:p-4.5 shadow-2xs flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">Read</span>
                                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                    <Eye size={15} strokeWidth={2.5} />
                                </div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 tabular-nums tracking-tight">
                                    {stats?.read ?? 0}
                                </div>
                                <span className="text-[12px] font-medium text-slate-400 dark:text-slate-500">Opened by customers</span>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl rounded-xl border border-slate-200/80 dark:border-white/10 p-4 sm:p-4.5 shadow-2xs flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">Failed</span>
                                <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                                    <AlertTriangle size={15} strokeWidth={2.5} />
                                </div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums tracking-tight">
                                    {stats?.failed ?? 0}
                                </div>
                                <span className="text-[12px] font-medium text-slate-400 dark:text-slate-500">Undelivered or invalid</span>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl rounded-xl border border-slate-200/80 dark:border-white/10 p-4 sm:p-4.5 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">Success Rate</span>
                                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                    <TrendingUp size={15} strokeWidth={2.5} />
                                </div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums tracking-tight">
                                    {stats?.success_rate ?? 0}%
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500 bg-amber-500"
                                        style={{ width: `${stats?.success_rate ?? 0}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Performance By Event Type Table */}
                    <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl rounded-xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-xs">
                        <div className="px-5 py-3.5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                    <BarChart3 size={15} strokeWidth={2.5} />
                                </div>
                                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Performance By Event Trigger</h3>
                            </div>
                            <span className="text-[12px] font-semibold text-slate-400 dark:text-slate-500 tabular-nums">
                                {allEventsToDisplay.length} Event Types
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50/75 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider font-bold border-b border-slate-200/60 dark:border-white/5">
                                    <tr>
                                        <th className="px-5 py-3">Event Type</th>
                                        <th className="px-5 py-3">Total Sent</th>
                                        <th className="px-5 py-3">Delivered</th>
                                        <th className="px-5 py-3">Read</th>
                                        <th className="px-5 py-3">Failed</th>
                                        <th className="px-5 py-3 text-right">Delivery Rate</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-200 font-medium">
                                    {allEventsToDisplay.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-5 py-10 text-center text-slate-400 dark:text-slate-500 font-medium text-[13px]">
                                                No notification events logged for the selected time range.
                                            </td>
                                        </tr>
                                    ) : allEventsToDisplay.map((s, i) => (
                                        <tr key={i} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                                            <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white flex items-center gap-2.5 text-[13px]">
                                                <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                                                <span>{EVENT_LABEL[s.event_type] || s.event_type}</span>
                                            </td>
                                            <td className="px-5 py-3.5 font-bold tabular-nums text-slate-900 dark:text-slate-100 text-[13px]">{s.total}</td>
                                            <td className="px-5 py-3.5 font-bold tabular-nums text-emerald-600 dark:text-emerald-400 text-[13px]">{s.delivered}</td>
                                            <td className="px-5 py-3.5 font-bold tabular-nums text-blue-600 dark:text-blue-400 text-[13px]">{s.read}</td>
                                            <td className="px-5 py-3.5 font-bold tabular-nums text-rose-600 dark:text-rose-400 text-[13px]">{s.failed}</td>
                                            <td className="px-5 py-3.5 text-right">
                                              <div className="inline-flex items-center justify-end gap-2.5 min-w-[120px]">
                                                    <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shrink-0">
                                                        <div
                                                            className="h-full rounded-full transition-all duration-500"
                                                            style={{
                                                                width: `${s.success_rate}%`,
                                                                backgroundColor: s.success_rate >= 90 ? '#10B981' : s.success_rate >= 50 ? '#F59E0B' : '#EF4444'
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="font-bold tabular-nums text-slate-900 dark:text-white text-[13px] w-10 text-right">
                                                        {s.success_rate}%
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════
                3. MESSAGE LOGS TAB
            ══════════════════════════════════════════════ */}
            {activeTab === "history" && (
                <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl rounded-xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-xs">
                    {/* Search & Filters */}
                    <div className="p-3.5 sm:p-4 border-b border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-50/40 dark:bg-slate-800/20">
                        <div className="relative flex-1 w-full">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by customer name or phone number..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full h-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg pl-9 pr-4 text-[13px] font-medium text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:flex-initial">
                                <select
                                    value={filterStatus}
                                    onChange={e => setFilterStatus(e.target.value)}
                                    className="w-full sm:w-auto h-10 pl-3 pr-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg text-[13px] font-medium text-slate-800 dark:text-slate-200 outline-none appearance-none cursor-pointer"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="delivered">Delivered</option>
                                    <option value="read">Read</option>
                                    <option value="sent">Sent</option>
                                    <option value="pending">Pending</option>
                                    <option value="failed">Failed</option>
                                    <option value="skipped">Skipped</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>

                            <div className="relative flex-1 sm:flex-initial">
                                <select
                                    value={filterEventType}
                                    onChange={e => setFilterEventType(e.target.value)}
                                    className="w-full sm:w-auto h-10 pl-3 pr-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg text-[13px] font-medium text-slate-800 dark:text-slate-200 outline-none appearance-none cursor-pointer"
                                >
                                    <option value="">All Events</option>
                                    {ACTIVE_EVENTS.map(ev => (
                                        <option key={ev} value={ev}>{EVENT_LABEL[ev] || ev}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>

                            {(searchQuery || filterStatus || filterEventType) && (
                                <button
                                    onClick={() => { setSearchQuery(""); setFilterStatus(""); setFilterEventType(""); }}
                                    className="h-10 px-3 flex items-center gap-1 text-[13px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                    title="Clear search and filters"
                                >
                                    <FilterX size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                            <thead className="bg-slate-50/75 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider font-bold border-b border-slate-200/60 dark:border-white/5">
                                <tr>
                                    <th className="px-5 py-3">Customer</th>
                                    <th className="px-5 py-3">Event Trigger</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3">Time</th>
                                    <th className="px-5 py-3 text-right">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-200 font-medium">
                                {logs?.items.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-5 py-12 text-center text-slate-400 dark:text-slate-500 font-medium text-[13px]">
                                            No messages found matching the selected filters.
                                        </td>
                                    </tr>
                                ) : logs?.items.map((m: WhatsAppMessage) => (
                                    <tr
                                        key={m.id}
                                        onClick={() => setSelectedMessage(m)}
                                        className="hover:bg-slate-50/75 dark:hover:bg-white/[0.02] transition-colors cursor-pointer group"
                                    >
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] flex items-center justify-center border border-slate-200/60 dark:border-white/5">
                                                    {(m.customer_name || "U").substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 dark:text-white text-[13px]">
                                                        {m.customer_name || "Walk-in Customer"}
                                                    </div>
                                                    <div className="font-mono text-[12px] text-slate-500 dark:text-slate-400">
                                                        {m.customer_phone}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[12px] font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/5">
                                                {EVENT_LABEL[m.event_type || ""] || m.event_type || "—"}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <StatusBadge status={m.status} />
                                        </td>
                                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 font-medium text-[12px]">
                                            {m.sent_at ? fmtDateTime(m.sent_at, tz) : "—"}
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setSelectedMessage(m); }}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all cursor-pointer"
                                            >
                                                <Eye size={13} />
                                                <span>Inspect</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {logs && logs.total > 50 && (
                        <div className="px-5 py-3.5 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850">
                            <div className="text-[13px] text-slate-500 dark:text-slate-400 font-medium">
                                Showing <span className="font-bold text-slate-900 dark:text-white">{(currentPage - 1) * 50 + 1}</span> to <span className="font-bold text-slate-900 dark:text-white">{Math.min(currentPage * 50, logs.total)}</span> of <span className="font-bold text-slate-900 dark:text-white">{logs.total}</span> messages
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3.5 py-1.5 text-[13px] font-semibold rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => p + 1)}
                                    disabled={currentPage * 50 >= logs.total}
                                    className="px-3.5 py-1.5 text-[13px] font-semibold rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════
                4. NOTIFICATION SETTINGS TAB
            ══════════════════════════════════════════════ */}
            {activeTab === "settings" && (
                <div className="max-w-4xl space-y-6">
                    {/* Master Switch Card */}
                    <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl rounded-xl border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={18} className="text-emerald-500" />
                                <h2 className="text-base font-bold text-slate-900 dark:text-white">Master WhatsApp Gateway</h2>
                            </div>
                            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed font-normal">
                                Global toggle for all outbound WhatsApp messaging. When disabled, no messages will be sent for any events.
                            </p>
                        </div>
                        <label className="flex items-center gap-3 cursor-pointer shrink-0">
                            <div
                                onClick={() => handleSettingChange("is_enabled", !(config?.is_enabled ?? true))}
                                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-300 ${config?.is_enabled ?? true ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${config?.is_enabled ?? true ? "translate-x-6" : "translate-x-1"}`} />
                            </div>
                        </label>
                    </div>

                    {/* Test Notification Sender */}
                    <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl rounded-xl border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 shadow-xs">
                        <div className="flex items-center gap-2 mb-1.5">
                            <Sparkles size={17} className="text-indigo-500" />
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">Send Live Test Message</h3>
                        </div>
                        <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-4 font-normal">
                            Verify Meta WhatsApp Cloud API credentials and delivery by sending a sample template notification to a verified phone.
                        </p>
                        <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
                            <div className="relative flex-1">
                                <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="tel"
                                    placeholder="Enter phone with country code e.g. +919876543210"
                                    value={testPhone}
                                    onChange={e => { setTestPhone(e.target.value); setTestMsg(null); }}
                                    className="w-full h-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg pl-10 pr-3.5 text-[13px] font-mono text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={sendTest}
                                disabled={sendingTest || !testPhone}
                                className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[13px] font-bold transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                            >
                                <Send size={14} />
                                <span>{sendingTest ? "Sending Test..." : "Send Test"}</span>
                            </button>
                        </div>
                        {testMsg && (
                            <div className={`mt-3.5 px-3.5 py-2.5 rounded-lg text-[13px] font-medium border flex items-start gap-2 ${testMsg.type === "success"
                                ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40"
                                : "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/40"
                            }`}>
                                {testMsg.type === "success" ? <Check size={15} className="mt-0.5 shrink-0" /> : <AlertTriangle size={15} className="mt-0.5 shrink-0" />}
                                <span>{testMsg.text}</span>
                            </div>
                        )}
                    </div>

                    {/* Trigger List */}
                    <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl rounded-xl border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                        <div className="p-5 border-b border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40 dark:bg-slate-800/20">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">Customer Event Triggers</h3>
                                <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5 font-normal">Toggle automated notifications sent at each queue lifecycle stage.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleEnableAll(true)}
                                    disabled={updatingSettings}
                                    className="px-3.5 py-1.5 text-[13px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200/60 dark:border-emerald-800/40 cursor-pointer"
                                >
                                    Enable All
                                </button>
                                <button
                                    onClick={() => handleEnableAll(false)}
                                    disabled={updatingSettings}
                                    className="px-3.5 py-1.5 text-[13px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200/80 dark:border-white/5 cursor-pointer"
                                >
                                    Disable All
                                </button>
                            </div>
                        </div>

                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                            {[
                                {
                                    key: "notify_queue_joined",
                                    title: "Joined Queue Confirmation",
                                    desc: "Sends digital token link and queue position when customer is added.",
                                    icon: CheckCircle2
                                },
                                {
                                    key: "notify_position_5",
                                    title: "Position 5 Reminder",
                                    desc: "Alerts customer when exactly 5 people are ahead in the queue.",
                                    icon: Clock
                                },
                                {
                                    key: "notify_position_3",
                                    title: "Position 3 Reminder (Turn is Near)",
                                    desc: "Urgent warning notifying the customer their turn is about to be called.",
                                    icon: AlertTriangle
                                },
                                {
                                    key: "notify_called",
                                    title: "Customer Called to Counter",
                                    desc: "Alerts customer to proceed directly to the designated counter or service lane.",
                                    icon: BellRing
                                },
                                {
                                    key: "notify_completed",
                                    title: "Service Completed / Thank You",
                                    desc: "Sends a polite completion notice and optional feedback receipt link.",
                                    icon: Check
                                },
                                {
                                    key: "notify_skipped",
                                    title: "Token Skipped Notice",
                                    desc: "Notifies customer when their token is skipped due to unavailability at the counter.",
                                    icon: XCircle
                                },
                                {
                                    key: "notify_recalled",
                                    title: "Token Recalled Alert",
                                    desc: "Alerts customer when staff re-calls their previously skipped token back into service.",
                                    icon: TrendingUp
                                },
                                {
                                    key: "notify_removed",
                                    title: "Token Removed / Cancelled",
                                    desc: "Notifies customer when removed from queue by staff or self-cancellation.",
                                    icon: FilterX
                                }
                            ].map((setting) => {
                                const isEnabled = config?.[setting.key as keyof WhatsAppOrgConfig] ?? true;
                                const Icon = setting.icon;
                                return (
                                    <div key={setting.key} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                        <div className="flex items-start gap-3.5">
                                            <div className="mt-0.5 w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-white/5">
                                                <Icon size={17} strokeWidth={2.2} />
                                            </div>
                                            <div>
                                                <div className="text-[13px] font-bold text-slate-900 dark:text-white">{setting.title}</div>
                                                <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{setting.desc}</div>
                                            </div>
                                        </div>

                                        <div
                                            onClick={() => handleSettingChange(setting.key as keyof WhatsAppOrgConfig, !isEnabled)}
                                            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 cursor-pointer ${isEnabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"}`}
                                        >
                                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${isEnabled ? "translate-x-4.5" : "translate-x-0.5"}`} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════
                5. REALISTIC WHATSAPP INSPECTION DRAWER / MODAL
            ══════════════════════════════════════════════ */}
            {selectedMessage && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
                        onClick={() => setSelectedMessage(null)}
                    />
                    <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="px-6 py-4.5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-500/20">
                                    <MessageSquareText size={18} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-base text-slate-900 dark:text-white">Message Log Inspection</h3>
                                    <span className="text-[12px] text-slate-400 dark:text-slate-500 font-mono">ID: {selectedMessage.id.substring(0, 12)}...</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedMessage(null)}
                                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            >
                                <X size={17} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto space-y-6">
                            {/* Realistic WhatsApp Chat Bubble Preview */}
                            <div>
                                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                    <MessageSquareText size={13} />
                                    <span>WhatsApp Customer Preview</span>
                                </div>
                                <div className="p-4 rounded-xl bg-[#EFEAE2] dark:bg-[#0c1317] border border-slate-200 dark:border-white/5 relative flex justify-end">
                                    <div className="bg-[#E7FFDB] dark:bg-[#005c4b] text-slate-900 dark:text-slate-100 rounded-2xl rounded-tr-xs p-3.5 shadow-xs max-w-sm text-[13px] leading-relaxed">
                                        <div className="font-semibold text-emerald-800 dark:text-emerald-300 text-[12px] mb-1">
                                            {EVENT_LABEL[selectedMessage.event_type || ""] || "Queue Notification"}
                                        </div>
                                        <div className="whitespace-pre-wrap font-sans">
                                            {selectedMessage.rendered_body || (
                                                `Hello ${selectedMessage.customer_name || "Valued Customer"},\n\nYour queue update for ${EVENT_LABEL[selectedMessage.event_type || ""] || "your token"}.\n\nThank you for choosing us!`
                                            )}
                                        </div>
                                        <div className="flex items-center justify-end gap-1 mt-2 text-[11px] text-slate-500 dark:text-slate-300">
                                            <span>{selectedMessage.sent_at ? fmtTimeTz(selectedMessage.sent_at, tz) : "Just now"}</span>
                                            {selectedMessage.status === "read" ? (
                                                <CheckCheck size={15} className="text-blue-500" />
                                            ) : selectedMessage.status === "delivered" ? (
                                                <CheckCheck size={15} className="text-slate-400" />
                                            ) : (
                                                <Check size={15} className="text-slate-400" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Metadata Grid */}
                            <div className="grid grid-cols-2 gap-3.5 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-white/5 text-[13px]">
                                <div>
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Customer</span>
                                    <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">{selectedMessage.customer_name || "Unknown"}</span>
                                </div>
                                <div>
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Recipient Phone</span>
                                    <span className="font-mono text-slate-700 dark:text-slate-300 mt-0.5 block">{selectedMessage.customer_phone}</span>
                                </div>
                                <div>
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Delivery Status</span>
                                    <div className="mt-1">
                                        <StatusBadge status={selectedMessage.status} />
                                    </div>
                                </div>
                                <div>
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Timestamp</span>
                                    <span className="font-medium text-slate-700 dark:text-slate-300 mt-0.5 block">
                                        {selectedMessage.sent_at ? fmtDateTime(selectedMessage.sent_at, tz) : "—"}
                                    </span>
                                </div>
                                <div className="col-span-2 pt-1.5 border-t border-slate-200/60 dark:border-white/5">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Meta WABA Message ID</span>
                                    <span className="font-mono text-[12px] text-slate-500 dark:text-slate-400 truncate block mt-0.5" title={selectedMessage.meta_message_id || ""}>
                                        {selectedMessage.meta_message_id || "—"}
                                    </span>
                                </div>
                            </div>

                            {/* Error Details if any */}
                            {(selectedMessage.error_message || selectedMessage.error_code) && (
                                <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 rounded-xl text-[13px] text-rose-700 dark:text-rose-300">
                                    <div className="font-bold flex items-center gap-1.5 mb-1 text-rose-800 dark:text-rose-200">
                                        <AlertTriangle size={15} />
                                        <span>Delivery Error ({selectedMessage.error_code || "WABA Error"})</span>
                                    </div>
                                    <p className="leading-relaxed">{selectedMessage.error_message}</p>
                                </div>
                            )}

                            {/* Raw Payload Collapsible */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Template Variables & Payload</span>
                                    <button
                                        onClick={() => copyPayloadToClipboard(JSON.stringify(selectedMessage.template_variables || selectedMessage.rendered_body, null, 2))}
                                        className="inline-flex items-center gap-1 text-[12px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                                    >
                                        {copiedPayload ? <Check size={13} /> : <Copy size={13} />}
                                        <span>{copiedPayload ? "Copied" : "Copy Payload"}</span>
                                    </button>
                                </div>
                                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 overflow-x-auto max-h-36">
                                    <pre className="text-[12px] font-mono text-emerald-400 leading-relaxed">
                                        {JSON.stringify(selectedMessage.template_variables || selectedMessage.rendered_body || {}, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-850 flex justify-end">
                            <button
                                onClick={() => setSelectedMessage(null)}
                                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-lg text-[13px] font-semibold transition-colors cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
