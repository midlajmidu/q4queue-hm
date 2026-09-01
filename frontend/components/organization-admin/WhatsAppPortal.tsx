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
    RotateCcw,
    Layers,
    SlidersHorizontal,
    Inbox,
    ArrowLeft,
    MoreVertical,
    Smartphone
} from "lucide-react";
import { useBranchTimezone } from "@/context/BranchTimezoneContext";
import { fmtDateTime, fmtTime as fmtTimeTz, nowInTz } from "@/lib/tzformat";
import { toast } from "sonner";

const EVENT_LABEL: Record<string, string> = {
    "queue_joined_v4": "Joined Queue Confirmation",
    "queue_nearby_5_v3": "Position 5 Warning",
    "queue_nearby_3_v3": "Position 3 Urgent Alert",
    "queue_called_v3": "Called to Counter",
    "queue_completed_v3": "Service Completed / Thank You",
    "queue_skipped_v3": "Token Skipped Notice",
    "queue_removed_v3": "Token Cancelled / Removed",
    "queue_recalled_v2": "Token Recalled Alert",

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
    "test": "Live Test Notification",
};

const EVENT_SHORT_LABEL: Record<string, string> = {
    "queue_joined_v4": "Joined Queue",
    "queue_nearby_5_v3": "Position 5",
    "queue_nearby_3_v3": "Position 3 (Near)",
    "queue_called_v3": "Called to Counter",
    "queue_completed_v3": "Completed",
    "queue_skipped_v3": "Skipped",
    "queue_removed_v3": "Cancelled",
    "queue_recalled_v2": "Recalled",
    "test": "Test Message",
};

const EVENT_COLOR: Record<string, string> = {
    "queue_joined_v4": "bg-blue-500",
    "queue_nearby_5_v3": "bg-sky-500",
    "queue_nearby_3_v3": "bg-amber-500",
    "queue_called_v3": "bg-emerald-500",
    "queue_completed_v3": "bg-indigo-500",
    "queue_skipped_v3": "bg-purple-500",
    "queue_removed_v3": "bg-rose-500",
    "queue_recalled_v2": "bg-teal-500",
    "test": "bg-emerald-500",
};

const ACTIVE_EVENTS = [
    "queue_joined_v4",
    "queue_nearby_5_v3",
    "queue_nearby_3_v3",
    "queue_called_v3",
    "queue_completed_v3",
    "queue_skipped_v3",
    "queue_recalled_v2",
    "queue_removed_v3",
];

const SAMPLE_MESSAGES: Record<string, { title: string; body: string }> = {
    "queue_joined_v4": {
        title: "Joined Queue Confirmation",
        body: "Greetings, *John Doe*!\n\n🎟️ Your queue ticket has been confirmed.\n\n🎫 *Ticket Number:* A-104\n👥 *People Ahead:* 6\n\n*Track your queue:*\nhttps://q4queue.com/track/t-abc123\n\n*View Live Display:*\nhttps://q4queue.com/live/branch-01\n\n🏢 *Branch:* Main Branch\n📋 *Queue:* General Inquiries\n\n_We'll keep you updated as your turn gets closer._"
    },
    "queue_nearby_5_v3": {
        title: "Position 5 Warning",
        body: "Your turn is getting closer.\n\n🎫 *Ticket Number:* A-104\n👥 Only *5 people* are ahead of you.\n\nPlease be ready.\n\n*Track your queue:*\nhttps://q4queue.com/track/t-abc123"
    },
    "queue_nearby_3_v3": {
        title: "Position 3 Urgent Alert",
        body: "Your turn is almost here! Only *3 people* are ahead of you.\n\n🎫 *Ticket Number:* A-104\n📋 *Queue:* General Inquiries\n👥 *People Ahead:* 3\n\nPlease head towards the service area and be ready."
    },
    "queue_called_v3": {
        title: "Called to Counter",
        body: "Please proceed to *Counter 02*.\n\n🎫 *Ticket Number:* A-104\n📋 *Queue:* General Inquiries\n\nOur staff is ready to assist you."
    },
    "queue_completed_v3": {
        title: "Service Completed",
        body: "Your visit has been completed successfully.\n\n🎫 *Ticket Number:* A-104\n📋 *Queue:* General Inquiries\n\n_Thank you for choosing us._"
    },
    "queue_skipped_v3": {
        title: "Token Skipped Notice",
        body: "Your ticket was skipped at *Counter 02*.\n\n🎫 *Ticket Number:* A-104\n📋 *Queue:* General Inquiries\n\nPlease contact our staff if you are still available."
    },
    "queue_recalled_v2": {
        title: "Token Recalled Alert",
        body: "Please proceed to *Counter 02*.\n\nYour ticket has been recalled.\n\n🎫 *Ticket Number:* A-104\n📋 *Queue:* General Inquiries\n\nOur staff is waiting to assist you."
    },
    "queue_removed_v3": {
        title: "Token Cancelled",
        body: "Your queue ticket has been cancelled.\n\n🎫 *Ticket Number:* A-104\n📋 *Queue:* General Inquiries\n\nIf this was unexpected, please contact our staff."
    },
    "test": {
        title: "Live Test Notification",
        body: "🧪 *Test Notification*\n\nYour Meta WhatsApp Cloud API connection is active and operational for Q4Queue!"
    }
};

/**
 * Authentic WhatsApp Wallpaper Background using official light & dark wallpaper images
 */
function WhatsAppWallpaperContainer({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`relative overflow-hidden bg-[#EFEAE2] dark:bg-[#0B141A] ${className}`}>
            {/* Light Mode Wallpaper Background */}
            <div
                className="absolute inset-0 w-full h-full bg-repeat opacity-[0.92] dark:hidden pointer-events-none transition-opacity duration-300"
                style={{
                    backgroundImage: "url('/whatsapp-wallpaper.jpg')",
                    backgroundSize: "320px auto",
                    backgroundRepeat: "repeat",
                }}
            />

            {/* Dark Mode Wallpaper Background */}
            <div
                className="absolute inset-0 w-full h-full bg-repeat hidden dark:block opacity-[0.88] pointer-events-none transition-opacity duration-300"
                style={{
                    backgroundImage: "url('/whatsapp-wallpaper-dark.jpg')",
                    backgroundSize: "320px auto",
                    backgroundRepeat: "repeat",
                }}
            />

            {/* Content inside wallpaper */}
            <div className="relative z-10">{children}</div>
        </div>
    );
}

/**
 * Parses and renders WhatsApp markdown syntax (*bold*, _italic_, URLs) natively
 */
function renderWhatsAppText(text: string) {
    if (!text) return null;
    const lines = text.split("\n");

    return (
        <div className="space-y-1.5 font-sans leading-[19px] text-[12.5px] text-[#111B21] dark:text-[#E9EDEF]">
            {lines.map((line, lineIdx) => {
                if (line.trim() === "") {
                    return <div key={lineIdx} className="h-1.5" />;
                }

                // Match *bold*, _italic_, or URLs
                const tokenRegex = /(\*[^*]+\*|_[^_]+_|https?:\/\/[^\s]+)/g;
                const parts = line.split(tokenRegex);

                return (
                    <p key={lineIdx} className="break-words">
                        {parts.map((part, partIdx) => {
                            if (!part) return null;

                            // Bold: *text*
                            if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
                                return (
                                    <strong key={partIdx} className="font-bold text-[#111B21] dark:text-white">
                                        {part.slice(1, -1)}
                                    </strong>
                                );
                            }

                            // Italic: _text_
                            if (part.startsWith("_") && part.endsWith("_") && part.length > 2) {
                                return (
                                    <em key={partIdx} className="italic text-[#3B4A54] dark:text-[#8696A0]">
                                        {part.slice(1, -1)}
                                    </em>
                                );
                            }

                            // URL Link
                            if (part.startsWith("http://") || part.startsWith("https://")) {
                                return (
                                    <a
                                        key={partIdx}
                                        href={part}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[#027EB5] dark:text-[#53BDEB] underline font-medium hover:opacity-85"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {part}
                                    </a>
                                );
                            }

                            return <span key={partIdx}>{part}</span>;
                        })}
                    </p>
                );
            })}
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case "delivered":
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/40">
                    <CheckCheck size={12} className="text-emerald-600 dark:text-emerald-400" />
                    <span>Delivered</span>
                </span>
            );
        case "read":
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/40">
                    <Eye size={12} className="text-blue-500" />
                    <span>Read</span>
                </span>
            );
        case "sent":
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/70 dark:border-sky-800/40">
                    <Check size={12} className="text-sky-500" />
                    <span>Sent</span>
                </span>
            );
        case "pending":
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/40">
                    <Clock size={12} className="text-amber-500" />
                    <span>Pending</span>
                </span>
            );
        case "failed":
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/70 dark:border-rose-800/40">
                    <AlertTriangle size={12} className="text-rose-500" />
                    <span>Failed</span>
                </span>
            );
        case "skipped":
        default:
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/70 dark:border-slate-700/50">
                    <span>Skipped</span>
                </span>
            );
    }
}

/* ─── Skeleton Shimmer Block ──────────────────────────── */
function Skeleton({ className = "" }: { className?: string }) {
    return <div className={`bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl ${className}`} />;
}

interface WhatsAppPortalProps {
    channel?: "whatsapp" | "calls";
    onChannelChange?: (channel: "whatsapp" | "calls") => void;
}

export function WhatsAppPortal({ channel = "whatsapp", onChannelChange }: WhatsAppPortalProps) {
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

    // Interactive Preview selection state
    const [selectedPreviewEvent, setSelectedPreviewEvent] = useState<string>("queue_joined_v4");

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

    // Settings & Quick Test state
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
            toast.success("Notification trigger updated");
        } catch {
            setConfig(previousConfig);
            toast.error("Failed to update trigger setting");
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
            toast.success(enabled ? "All WhatsApp triggers enabled" : "All WhatsApp triggers disabled");
        } catch {
            setConfig(previousConfig);
            toast.error("Failed to update settings");
        } finally {
            setUpdatingSettings(false);
        }
    };

    const sendTest = async () => {
        const cleaned = testPhone.trim();
        if (!cleaned || !cleaned.startsWith("+") || cleaned.length < 8) {
            setTestMsg({ type: "error", text: "Please enter a valid phone number with country code (e.g. +919876543210)" });
            return;
        }
        setSendingTest(true);
        setTestMsg(null);
        try {
            await api.sendWhatsAppTestNotification(cleaned);
            setTestMsg({ type: "success", text: "Test message delivered! Check WhatsApp on the recipient device." });
            toast.success("Test notification dispatched to " + cleaned);
            setTimeout(() => {
                loadFilteredData();
            }, 1500);
        } catch (err: any) {
            setTestMsg({ type: "error", text: err?.message || "Failed to send test message. Check Meta Cloud API credentials." });
            toast.error("Failed to deliver test message");
        } finally {
            setSendingTest(false);
        }
    };

    const copyPayloadToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedPayload(true);
        toast.success("Payload copied to clipboard");
        setTimeout(() => setCopiedPayload(false), 2000);
    };

    const tabs: Array<{
        id: "overview" | "history" | "settings";
        label: string;
        icon: React.ElementType;
        count?: number;
    }> = [
        { id: "overview", label: "Studio Overview", icon: BarChart3 },
        { id: "history", label: "Message Logs", icon: MessageSquareText, count: logs?.total },
        { id: "settings", label: "Trigger Settings", icon: Settings }
    ];

    const hasActiveFilters = Boolean(startDate || endDate || filterQueueId);
    const totalPages = logs ? Math.ceil(logs.total / 50) : 1;

    // Active Preview Template
    const activePreview = SAMPLE_MESSAGES[selectedPreviewEvent] || SAMPLE_MESSAGES["queue_joined_v4"];

    /* ─── Compact Filter Toolbar ──────────────────────────── */
    const FilterBar = () => (
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-2">
            {/* Quick Presets */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-white/5 shrink-0 overflow-x-auto">
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
                            className={`px-3 py-1.5 text-[12px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${isSelected
                                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                            }`}
                        >
                            {labels[p]}
                        </button>
                    );
                })}
            </div>

            {/* Date Pickers & Queue Dropdown */}
            <div className="flex items-center gap-2.5 flex-wrap flex-1 justify-start lg:justify-end">
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all shadow-2xs">
                    <Calendar size={13} className="text-slate-400 shrink-0" />
                    <input
                        type="date"
                        value={startDate}
                        onChange={e => { setStartDate(e.target.value); setDatePreset("all"); }}
                        className="bg-transparent text-[12px] font-semibold text-slate-800 dark:text-slate-200 outline-none w-28"
                        placeholder="Start Date"
                    />
                    <span className="text-slate-300 dark:text-slate-600 text-[11px] font-bold">→</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={e => { setEndDate(e.target.value); setDatePreset("all"); }}
                        className="bg-transparent text-[12px] font-semibold text-slate-800 dark:text-slate-200 outline-none w-28"
                        placeholder="End Date"
                    />
                </div>

                <div className="relative">
                    <select
                        value={filterQueueId}
                        onChange={e => setFilterQueueId(e.target.value)}
                        className="h-9 pl-3 pr-8 bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 rounded-xl text-[12px] font-semibold text-slate-800 dark:text-slate-200 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-2xs"
                    >
                        <option value="">All Service Queues</option>
                        {queues.map(q => (
                            <option key={q.id} value={q.id}>{q.name}</option>
                        ))}
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                {hasActiveFilters && (
                    <button
                        onClick={() => { setStartDate(""); setEndDate(""); setFilterQueueId(""); setDatePreset("all"); }}
                        className="h-9 px-3 flex items-center gap-1.5 text-[12px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-xl transition-colors cursor-pointer border border-rose-200/60 dark:border-rose-800/30"
                    >
                        <FilterX size={13} />
                        <span>Reset Filters</span>
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-6 w-full pb-16 min-h-screen">
            {/* ══════════════════════════════════════════════
                1. EXECUTIVE STUDIO APP HEADER & TABS
            ══════════════════════════════════════════════ */}
            <div className="bg-white dark:bg-slate-900/70 dark:backdrop-blur-xl rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
                {/* Header Top Row: Title + Status + Channel Switcher */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3.5">
                        <div className="p-2 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 border border-emerald-100 dark:border-emerald-500/20 shadow-2xs">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                    WhatsApp & Communications
                                </h1>
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/40">
                                    <span className="inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    <span>Meta Cloud API • Connected</span>
                                </div>
                            </div>
                            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
                                Automated queue lifecycle triggers, live delivery telemetry, and interactive message preview
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
                                <MessageSquareText size={15} className={channel === "whatsapp" ? "text-emerald-600 dark:text-emerald-400" : ""} />
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
                                <Phone size={15} className={channel === "calls" ? "text-indigo-500" : ""} />
                                <span>Voice Telephony</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Sub-Navigation Tabs */}
                <div className="flex items-center gap-1.5 border-t border-slate-100 dark:border-white/5 pt-4 overflow-x-auto">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold transition-all cursor-pointer whitespace-nowrap ${isActive
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-xs"
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

                {/* Integrated Filter Bar (Visible on Studio Overview and Message Logs) */}
                {(activeTab === "overview" || activeTab === "history") && (
                    <div className="border-t border-slate-100 dark:border-white/5 pt-3">
                        <FilterBar />
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════════════
                2. TAB: STUDIO OVERVIEW (UNIFIED METRICS + SPLIT STUDIO)
            ══════════════════════════════════════════════ */}
            {activeTab === "overview" && (
                <div className="space-y-6">
                    {/* Unified Metric Ribbon Card */}
                    {loading ? (
                        <div className="bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-white/10 p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="space-y-2">
                                    <Skeleton className="h-3 w-20" />
                                    <Skeleton className="h-8 w-16" />
                                    <Skeleton className="h-2.5 w-24" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-900/70 dark:backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-white/5">
                                {/* 1. Total Sent */}
                                <div className="p-5 flex flex-col justify-between hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Sent</span>
                                        <Send size={15} className="text-slate-400 dark:text-slate-500" />
                                    </div>
                                    <div>
                                        <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                                            {stats?.total ?? 0}
                                        </div>
                                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 block">Total notifications</span>
                                    </div>
                                </div>

                                {/* 2. Delivered */}
                                <div className="p-5 flex flex-col justify-between hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Delivered</span>
                                        <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div>
                                        <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                                            {stats?.delivered ?? 0}
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                                                {stats?.total ? Math.round(((stats.delivered ?? 0) / stats.total) * 100) : 0}% delivery rate
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* 3. Read */}
                                <div className="p-5 flex flex-col justify-between hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Read by Client</span>
                                        <Eye size={15} className="text-blue-500" />
                                    </div>
                                    <div>
                                        <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                                            {stats?.read ?? 0}
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                                                {stats?.delivered ? Math.round(((stats.read ?? 0) / stats.delivered) * 100) : 0}% open rate
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* 4. Failed */}
                                <div className="p-5 flex flex-col justify-between hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Failed</span>
                                        <AlertTriangle size={15} className="text-rose-500" />
                                    </div>
                                    <div>
                                        <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                                            {stats?.failed ?? 0}
                                        </div>
                                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 block">Undelivered / invalid</span>
                                    </div>
                                </div>

                                {/* 5. Overall Success Rate */}
                                <div className="p-5 flex flex-col justify-between col-span-2 sm:col-span-1 hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Success Rate</span>
                                        <TrendingUp size={15} className="text-amber-500" />
                                    </div>
                                    <div>
                                        <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
                                            {stats?.success_rate ?? 0}%
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{
                                                    width: `${stats?.success_rate ?? 0}%`,
                                                    backgroundColor: (stats?.success_rate ?? 0) >= 90 ? '#10B981' : (stats?.success_rate ?? 0) >= 50 ? '#F59E0B' : '#EF4444'
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════
                        SPLIT-SCREEN STUDIO LAYOUT (LEFT: TRIGGERS | RIGHT: PREVIEW)
                    ══════════════════════════════════════════════ */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* LEFT: Lifecycle Event Performance (7 Columns) */}
                        <div className="lg:col-span-7 bg-white dark:bg-slate-900/70 dark:backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                            <div className="px-5 sm:px-6 py-4 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-slate-50/40 dark:bg-slate-800/20">
                                <div>
                                    <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">
                                        Queue Lifecycle Triggers & Delivery
                                    </h3>
                                    <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                                        Select any lifecycle event to preview its live WhatsApp message
                                    </p>
                                </div>
                                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200/70 dark:border-emerald-800/40 tabular-nums">
                                    {allEventsToDisplay.length} Triggers
                                </span>
                            </div>

                            <div className="divide-y divide-slate-100 dark:divide-white/5">
                                {allEventsToDisplay.map((s) => {
                                    const isSelected = selectedPreviewEvent === s.event_type;

                                    return (
                                        <div
                                            key={s.event_type}
                                            onClick={() => setSelectedPreviewEvent(s.event_type)}
                                            className={`group p-4 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 transition-all cursor-pointer ${
                                                isSelected
                                                    ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-l-4 border-l-emerald-600 dark:border-l-emerald-500"
                                                    : "hover:bg-slate-50/80 dark:hover:bg-white/[0.02] border-l-4 border-l-transparent"
                                            }`}
                                        >
                                            {/* Event Title & Telemetry */}
                                            <div className="flex items-start gap-3">
                                                <div className="mt-1">
                                                    <span className={`w-2.5 h-2.5 rounded-full block ${EVENT_COLOR[s.event_type] || "bg-indigo-500"}`} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-900 dark:text-white text-[13px] group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                                                            {EVENT_LABEL[s.event_type] || s.event_type}
                                                        </span>
                                                        {isSelected && (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/50 shadow-2xs">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                                <span>Active in Studio</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1.5 text-[11.5px] text-slate-500 dark:text-slate-400 font-medium flex-wrap">
                                                        <span>Sent: <strong className="text-slate-900 dark:text-white font-bold">{s.total}</strong></span>
                                                        <span>•</span>
                                                        <span>Delivered: <strong className={s.delivered > 0 ? "text-emerald-700 dark:text-emerald-400 font-bold" : "text-slate-700 dark:text-slate-300"}>{s.delivered}</strong></span>
                                                        <span>•</span>
                                                        <span>Read: <strong className={s.read > 0 ? "text-blue-600 dark:text-blue-400 font-bold" : "text-slate-700 dark:text-slate-300"}>{s.read}</strong></span>
                                                        {s.failed > 0 && (
                                                            <>
                                                                <span>•</span>
                                                                <span className="text-rose-600 font-bold">Failed: {s.failed}</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Delivery Rate Bar & Arrow Indicator */}
                                            <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                                                <div className="text-right">
                                                    <div className="text-[12px] font-bold text-slate-900 dark:text-white tabular-nums">
                                                        {s.success_rate}%
                                                    </div>
                                                    <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1">
                                                        <div
                                                            className="h-full rounded-full transition-all duration-300"
                                                            style={{
                                                                width: `${s.success_rate}%`,
                                                                backgroundColor: s.success_rate >= 90 ? '#10B981' : s.success_rate >= 50 ? '#F59E0B' : '#EF4444'
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors ${
                                                    isSelected
                                                        ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                                                        : "text-slate-300 group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-400"
                                                }`}>
                                                    <ChevronRight size={16} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* RIGHT: Live WhatsApp Mockup Studio & Quick Tester (5 Columns) */}
                        <div className="lg:col-span-5 space-y-4">
                            {/* Realistic WhatsApp Chat Device Card */}
                            <div className="bg-white dark:bg-slate-900/70 dark:backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                                {/* WhatsApp Chat Top App Bar */}
                                <div className="bg-[#075E54] dark:bg-[#1F2C34] text-white px-3.5 py-2.5 flex items-center justify-between border-b border-[#054D44] dark:border-white/5">
                                    <div className="flex items-center gap-2">
                                        <div className="text-white/80 p-0.5">
                                            <ArrowLeft size={16} />
                                        </div>
                                        <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs shadow-2xs">
                                            <MessageSquareText size={14} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-bold text-xs text-white">Q4Queue Updates</span>
                                                <span className="w-3 h-3 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[8px] font-black" title="Verified Business">
                                                    ✓
                                                </span>
                                            </div>
                                            <span className="text-[9.5px] text-emerald-100/80 font-medium block">Official Business Account</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-white/80">
                                        <Phone size={14} className="hover:text-white transition-colors cursor-pointer" />
                                        <MoreVertical size={15} className="hover:text-white transition-colors cursor-pointer" />
                                    </div>
                                </div>

                                {/* Authentic WhatsApp Doodle Wallpaper Canvas */}
                                <WhatsAppWallpaperContainer className="p-4 min-h-[280px] flex flex-col justify-end border-b border-slate-200/60 dark:border-white/5">
                                    {/* Centered Date Pill */}
                                    <div className="flex justify-center mb-3">
                                        <div className="px-3 py-0.5 rounded-lg bg-white/90 dark:bg-[#182229]/95 text-[#54656F] dark:text-[#8696A0] text-[10.5px] font-semibold uppercase tracking-wider shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] border border-slate-200/50 dark:border-white/5">
                                            Today
                                        </div>
                                    </div>

                                    {/* WhatsApp Chat Bubble with Official Tail */}
                                    <div className="relative self-end max-w-[92%] bg-[#D9FDD3] dark:bg-[#005C4B] rounded-2xl rounded-tr-xs p-3.5 space-y-1.5 border border-[#b8e7b1]/60 dark:border-[#00483A] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
                                        {/* Official WhatsApp Sent Bubble Corner Tail */}
                                        <svg
                                            viewBox="0 0 8 13"
                                            width="8"
                                            height="13"
                                            className="absolute -top-[0.5px] -right-[7px] text-[#D9FDD3] dark:text-[#005C4B] fill-current pointer-events-none drop-shadow-[0_1px_0.5px_rgba(11,20,26,0.08)]"
                                        >
                                            <path d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z" />
                                        </svg>

                                        {/* Template Title Header */}
                                        <div className="font-bold text-[#008069] dark:text-[#25D366] text-[11px] pb-1 border-b border-[#b8e7b1]/70 dark:border-white/10">
                                            {activePreview.title}
                                        </div>

                                        {/* Message Body Content */}
                                        <div>
                                            {renderWhatsAppText(activePreview.body)}
                                        </div>

                                        {/* Timestamp & Double Blue Read Checks */}
                                        <div className="flex items-center justify-end gap-1 pt-1 text-[10px] text-[#667781] dark:text-[#8696A0]">
                                            <span>{fmtTimeTz(new Date().toISOString(), tz, false)}</span>
                                            <CheckCheck size={15} className="text-[#53BDEB]" />
                                        </div>
                                    </div>
                                </WhatsAppWallpaperContainer>

                                {/* Active Event Note */}
                                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-[11px]">
                                    <span className="text-slate-500 dark:text-slate-400 font-medium">Active Trigger: <strong className="text-slate-800 dark:text-slate-200">{EVENT_LABEL[selectedPreviewEvent]}</strong></span>
                                    <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        <span>Automated</span>
                                    </span>
                                </div>
                            </div>

                            {/* Quick Live Test Notification Sender */}
                            <div className="bg-white dark:bg-slate-900/70 dark:backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 p-4.5 shadow-xs space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Sparkles size={15} className="text-emerald-600 dark:text-emerald-400" />
                                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                                            Send Live WhatsApp Test
                                        </h4>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-medium">Meta API Verified</span>
                                </div>
                                <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-normal">
                                    Dispatch a live test template notification directly to your WhatsApp to verify connectivity.
                                </p>

                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="tel"
                                            placeholder="+919876543210"
                                            value={testPhone}
                                            onChange={e => { setTestPhone(e.target.value); setTestMsg(null); }}
                                            className="w-full h-10 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 rounded-xl pl-9 pr-3 text-[12px] font-mono text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={sendTest}
                                        disabled={sendingTest || !testPhone}
                                        className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[12px] font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
                                    >
                                        <Send size={13} />
                                        <span>{sendingTest ? "Sending..." : "Send Test"}</span>
                                    </button>
                                </div>

                                {testMsg && (
                                    <div className={`p-3 rounded-xl text-[12px] font-medium border flex items-start gap-2 ${
                                        testMsg.type === "success"
                                            ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200/70"
                                            : "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200/70"
                                    }`}>
                                        {testMsg.type === "success" ? <Check size={14} className="mt-0.5 shrink-0 text-emerald-600" /> : <AlertTriangle size={14} className="mt-0.5 shrink-0 text-rose-600" />}
                                        <span className="leading-snug">{testMsg.text}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════
                3. TAB: MESSAGE LOGS (HISTORY & INSPECTION)
            ══════════════════════════════════════════════ */}
            {activeTab === "history" && (
                <div className="bg-white dark:bg-slate-900/70 dark:backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-xs">
                    {/* Search & Status/Event Filters Toolbar */}
                    <div className="p-4 border-b border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-50/40 dark:bg-slate-800/20">
                        <div className="relative flex-1 w-full">
                            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by customer name or mobile number..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full h-10 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 rounded-xl pl-9 pr-4 text-[13px] font-medium text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-2xs"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:flex-initial">
                                <select
                                    value={filterStatus}
                                    onChange={e => setFilterStatus(e.target.value)}
                                    className="w-full sm:w-auto h-10 pl-3 pr-8 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 rounded-xl text-[12px] font-semibold text-slate-800 dark:text-slate-200 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-2xs"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="delivered">Delivered</option>
                                    <option value="read">Read</option>
                                    <option value="sent">Sent</option>
                                    <option value="pending">Pending</option>
                                    <option value="failed">Failed</option>
                                    <option value="skipped">Skipped</option>
                                </select>
                                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>

                            <div className="relative flex-1 sm:flex-initial">
                                <select
                                    value={filterEventType}
                                    onChange={e => setFilterEventType(e.target.value)}
                                    className="w-full sm:w-auto h-10 pl-3 pr-8 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 rounded-xl text-[12px] font-semibold text-slate-800 dark:text-slate-200 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-2xs"
                                >
                                    <option value="">All Lifecycle Events</option>
                                    {ACTIVE_EVENTS.map(ev => (
                                        <option key={ev} value={ev}>{EVENT_SHORT_LABEL[ev] || ev}</option>
                                    ))}
                                </select>
                                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>

                            {(searchQuery || filterStatus || filterEventType) && (
                                <button
                                    onClick={() => { setSearchQuery(""); setFilterStatus(""); setFilterEventType(""); }}
                                    className="h-10 px-3 flex items-center gap-1 text-[12px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer border border-slate-200/80 dark:border-white/5"
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
                                    <th className="px-5 sm:px-6 py-3.5">Customer</th>
                                    <th className="px-5 py-3.5">Event Trigger</th>
                                    <th className="px-5 py-3.5">Status</th>
                                    <th className="px-5 py-3.5">Timestamp</th>
                                    <th className="px-5 sm:px-6 py-3.5 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-200 font-medium">
                                {logs?.items.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-5 py-16 text-center">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                    <MessageSquareText size={22} className="text-slate-300 dark:text-slate-600" />
                                                </div>
                                                <div>
                                                    <p className="text-[13px] font-bold text-slate-700 dark:text-slate-300">No message logs found</p>
                                                    <p className="text-[12px] text-slate-400 dark:text-slate-500 mt-0.5">Try adjusting your date range or filters above.</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : logs?.items.map((m: WhatsAppMessage) => (
                                    <tr
                                        key={m.id}
                                        onClick={() => setSelectedMessage(m)}
                                        className="hover:bg-slate-50/75 dark:hover:bg-white/[0.02] transition-colors cursor-pointer group"
                                    >
                                        <td className="px-5 sm:px-6 py-3.5">
                                            <div className="flex items-center gap-3">
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
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[12px] font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/5">
                                                {EVENT_LABEL[m.event_type || ""] || m.event_type || "—"}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <StatusBadge status={m.status} />
                                        </td>
                                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 font-medium text-[12px]">
                                            {m.sent_at ? fmtDateTime(m.sent_at, tz) : "—"}
                                        </td>
                                        <td className="px-5 sm:px-6 py-3.5 text-right">
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setSelectedMessage(m); }}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200/70 dark:border-emerald-800/40 transition-all cursor-pointer"
                                            >
                                                <Eye size={13} />
                                                <span>Inspect Log</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {logs && logs.total > 50 && (
                        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850">
                            <div className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">
                                Showing <span className="font-bold text-slate-900 dark:text-white">{(currentPage - 1) * 50 + 1}</span> to <span className="font-bold text-slate-900 dark:text-white">{Math.min(currentPage * 50, logs.total)}</span> of <span className="font-bold text-slate-900 dark:text-white">{logs.total}</span> logs
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3.5 py-1.5 text-[12px] font-bold rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
                                >
                                    Previous
                                </button>
                                <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300 tabular-nums px-1">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => p + 1)}
                                    disabled={currentPage * 50 >= logs.total}
                                    className="px-3.5 py-1.5 text-[12px] font-bold rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════
                4. TAB: NOTIFICATION TRIGGER SETTINGS
            ══════════════════════════════════════════════ */}
            {activeTab === "settings" && (
                <div className="max-w-4xl space-y-5">
                    {/* Master Switch Card */}
                    <div className="bg-white dark:bg-slate-900/70 dark:backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
                                <h2 className="text-base font-bold text-slate-900 dark:text-white">Master WhatsApp Gateway</h2>
                            </div>
                            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed font-normal">
                                Global toggle for all outbound WhatsApp messaging. When disabled, no notifications will be dispatched to customers.
                            </p>
                        </div>
                        <label className="flex items-center gap-3 cursor-pointer shrink-0">
                            <div
                                onClick={() => handleSettingChange("is_enabled", !(config?.is_enabled ?? true))}
                                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-300 ${config?.is_enabled ?? true ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${config?.is_enabled ?? true ? "translate-x-6" : "translate-x-1"}`} />
                            </div>
                        </label>
                    </div>

                    {/* Trigger List */}
                    <div className="bg-white dark:bg-slate-900/70 dark:backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                        <div className="p-5 border-b border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40 dark:bg-slate-800/20">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">Customer Event Triggers</h3>
                                <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5 font-normal">Toggle automated notifications sent at each queue lifecycle milestone.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleEnableAll(true)}
                                    disabled={updatingSettings}
                                    className="px-3.5 py-1.5 text-[12px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-xl transition-colors border border-emerald-200/70 dark:border-emerald-800/40 cursor-pointer"
                                >
                                    Enable All
                                </button>
                                <button
                                    onClick={() => handleEnableAll(false)}
                                    disabled={updatingSettings}
                                    className="px-3.5 py-1.5 text-[12px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200/80 dark:border-white/5 cursor-pointer"
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
                                    desc: "Dispatches digital token link and initial queue position when customer joins.",
                                    icon: CheckCircle2
                                },
                                {
                                    key: "notify_position_5",
                                    title: "Position 5 Reminder",
                                    desc: "Warns customer when exactly 5 people remain ahead in the queue.",
                                    icon: Clock
                                },
                                {
                                    key: "notify_position_3",
                                    title: "Position 3 Urgent Alert",
                                    desc: "Urgent advisory notifying customer their turn is about to be called.",
                                    icon: AlertTriangle
                                },
                                {
                                    key: "notify_called",
                                    title: "Customer Called to Counter",
                                    desc: "Directs customer immediately to the designated serving counter or service lane.",
                                    icon: BellRing
                                },
                                {
                                    key: "notify_completed",
                                    title: "Service Completed / Thank You",
                                    desc: "Sends polite completion notice along with optional rating & feedback receipt link.",
                                    icon: Check
                                },
                                {
                                    key: "notify_skipped",
                                    title: "Token Skipped Notice",
                                    desc: "Notifies customer when their token is skipped due to non-appearance at counter.",
                                    icon: XCircle
                                },
                                {
                                    key: "notify_recalled",
                                    title: "Token Recalled Alert",
                                    desc: "Alerts customer when staff re-calls their previously skipped token back into active service.",
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
                                            <div className="mt-0.5 w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-white/5">
                                                <Icon size={17} strokeWidth={2.2} />
                                            </div>
                                            <div>
                                                <div className="text-[13px] font-bold text-slate-900 dark:text-white">{setting.title}</div>
                                                <div className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{setting.desc}</div>
                                            </div>
                                        </div>

                                        <div
                                            onClick={() => handleSettingChange(setting.key as keyof WhatsAppOrgConfig, !isEnabled)}
                                            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 cursor-pointer ${isEnabled ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"}`}
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
                5. REALISTIC WHATSAPP INSPECTION MODAL
            ══════════════════════════════════════════════ */}
            {selectedMessage && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
                        onClick={() => setSelectedMessage(null)}
                    />
                    <div className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="px-6 py-4.5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-slate-850">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20">
                                    <MessageSquareText size={18} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-base text-slate-900 dark:text-white">Message Log Inspection</h3>
                                    <span className="text-[12px] text-slate-400 dark:text-slate-500 font-mono">ID: {selectedMessage.id.substring(0, 12)}...</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedMessage(null)}
                                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                            >
                                <X size={17} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto space-y-5">
                            {/* Realistic WhatsApp Chat Bubble Preview */}
                            <div>
                                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                    <MessageSquareText size={13} />
                                    <span>WhatsApp Customer Preview</span>
                                </div>
                                <WhatsAppWallpaperContainer className="p-4 rounded-2xl border border-slate-200 dark:border-white/5 flex justify-end">
                                    <div className="relative bg-[#D9FDD3] dark:bg-[#005C4B] rounded-2xl rounded-tr-xs p-3.5 space-y-1.5 max-w-sm border border-[#b8e7b1]/60 dark:border-[#00483A] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
                                        {/* Official WhatsApp Sent Bubble Corner Tail */}
                                        <svg
                                            viewBox="0 0 8 13"
                                            width="8"
                                            height="13"
                                            className="absolute -top-[0.5px] -right-[7px] text-[#D9FDD3] dark:text-[#005C4B] fill-current pointer-events-none drop-shadow-[0_1px_0.5px_rgba(11,20,26,0.08)]"
                                        >
                                            <path d="M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z" />
                                        </svg>

                                        <div className="font-bold text-[#008069] dark:text-[#25D366] text-[11px] pb-1 border-b border-[#b8e7b1]/70 dark:border-white/10">
                                            {EVENT_LABEL[selectedMessage.event_type || ""] || "Queue Notification"}
                                        </div>
                                        <div>
                                            {renderWhatsAppText(
                                                selectedMessage.rendered_body ||
                                                `Greetings, *${selectedMessage.customer_name || "Valued Customer"}*!\n\nYour queue update for ${EVENT_LABEL[selectedMessage.event_type || ""] || "your token"}.\n\n_We'll keep you updated as your turn gets closer._`
                                            )}
                                        </div>
                                        <div className="flex items-center justify-end gap-1 pt-1 text-[10px] text-[#667781] dark:text-[#8696A0]">
                                            <span>{selectedMessage.sent_at ? fmtTimeTz(selectedMessage.sent_at, tz, false) : "Just now"}</span>
                                            {selectedMessage.status === "read" ? (
                                                <CheckCheck size={15} className="text-[#53BDEB]" />
                                            ) : selectedMessage.status === "delivered" ? (
                                                <CheckCheck size={15} className="text-slate-400" />
                                            ) : (
                                                <Check size={15} className="text-slate-400" />
                                            )}
                                        </div>
                                    </div>
                                </WhatsAppWallpaperContainer>
                            </div>

                            {/* Metadata Grid */}
                            <div className="grid grid-cols-2 gap-3.5 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-white/5 text-[13px]">
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
                                <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 rounded-2xl text-[13px] text-rose-700 dark:text-rose-300">
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
                                        className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                                    >
                                        {copiedPayload ? <Check size={13} /> : <Copy size={13} />}
                                        <span>{copiedPayload ? "Copied" : "Copy Payload"}</span>
                                    </button>
                                </div>
                                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 overflow-x-auto max-h-36">
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
                                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl text-[13px] font-bold transition-colors cursor-pointer"
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
