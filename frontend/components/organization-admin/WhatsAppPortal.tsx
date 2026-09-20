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
    SubscriptionSummary,
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
    ShieldCheck,
    ChevronLeft,
    ChevronRight,
    Copy,
    Info,
    RotateCcw,
    Layers,
    SlidersHorizontal,
    Inbox,
    ArrowLeft,
    MoreVertical,
    Smartphone,
    UserPlus,
    Megaphone,
    SkipForward,
    UserX,
    Wifi,
    Battery,
    Sparkles,
    Zap,
    CalendarCheck
} from "lucide-react";
import { useBranchTimezone } from "@/context/BranchTimezoneContext";
import { useAuth } from "@/hooks/useAuth";
import { fmtDateTime, fmtDate, fmtTime, fmtTime as fmtTimeTz, nowInTz } from "@/lib/tzformat";
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
    "appointment_booked_v1": "Appointment Booking Confirmed",

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
    "appointment_booked_v1": "Appointment Confirmed",
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
    "appointment_booked_v1": "bg-indigo-500",
    "test": "bg-emerald-500",
};

const EVENT_DESCRIPTION: Record<string, string> = {
    "queue_joined_v4": "Dispatches digital pass & tracking link when customer joins queue",
    "queue_nearby_5_v3": "Warns customer when exactly 5 people remain ahead in line",
    "queue_nearby_3_v3": "Urgent prompt to prepare when 3 people remain ahead in queue",
    "queue_called_v3": "Directs customer immediately to their assigned serving counter",
    "queue_completed_v3": "Sends visit completion summary & optional feedback receipt",
    "queue_skipped_v3": "Notifies customer when their ticket is skipped for no-show",
    "queue_recalled_v2": "Alerts customer when staff re-calls a previously skipped ticket",
    "queue_removed_v3": "Notifies customer if token is cancelled or removed from queue",
    "appointment_booked_v1": "Dispatches digital pass & booking details when appointment is confirmed",
    "test": "Dispatches connectivity verification message via Meta Cloud API",
};

const EVENT_TO_CONFIG_KEY: Record<string, keyof WhatsAppOrgConfig> = {
    "queue_joined_v4": "notify_queue_joined",
    "queue_nearby_5_v3": "notify_position_5",
    "queue_nearby_3_v3": "notify_position_3",
    "queue_called_v3": "notify_called",
    "queue_completed_v3": "notify_completed",
    "queue_skipped_v3": "notify_skipped",
    "queue_recalled_v2": "notify_recalled",
    "queue_removed_v3": "notify_removed",
};

const EVENT_ICON: Record<string, React.ElementType> = {
    "queue_joined_v4": UserPlus,
    "queue_nearby_5_v3": Clock,
    "queue_nearby_3_v3": AlertTriangle,
    "queue_called_v3": Megaphone,
    "queue_completed_v3": CheckCircle2,
    "queue_skipped_v3": SkipForward,
    "queue_recalled_v2": RotateCcw,
    "queue_removed_v3": UserX,
    "appointment_booked_v1": CalendarCheck,
    "test": Sparkles,
};

const EVENT_THEME: Record<string, { bg: string; text: string; lightBg: string; border: string }> = {
    "queue_joined_v4": {
        bg: "bg-blue-500",
        text: "text-blue-600 dark:text-blue-400",
        lightBg: "bg-blue-50 dark:bg-blue-950/40",
        border: "border-blue-200/80 dark:border-blue-800/40"
    },
    "queue_nearby_5_v3": {
        bg: "bg-sky-500",
        text: "text-sky-600 dark:text-sky-400",
        lightBg: "bg-sky-50 dark:bg-sky-950/40",
        border: "border-sky-200/80 dark:border-sky-800/40"
    },
    "queue_nearby_3_v3": {
        bg: "bg-amber-500",
        text: "text-amber-600 dark:text-amber-400",
        lightBg: "bg-amber-50 dark:bg-amber-950/40",
        border: "border-amber-200/80 dark:border-amber-800/40"
    },
    "queue_called_v3": {
        bg: "bg-emerald-500",
        text: "text-emerald-600 dark:text-emerald-400",
        lightBg: "bg-emerald-50 dark:bg-emerald-950/40",
        border: "border-emerald-200/80 dark:border-emerald-800/40"
    },
    "queue_completed_v3": {
        bg: "bg-indigo-500",
        text: "text-indigo-600 dark:text-indigo-400",
        lightBg: "bg-indigo-50 dark:bg-indigo-950/40",
        border: "border-indigo-200/80 dark:border-indigo-800/40"
    },
    "queue_skipped_v3": {
        bg: "bg-purple-500",
        text: "text-purple-600 dark:text-purple-400",
        lightBg: "bg-purple-50 dark:bg-purple-950/40",
        border: "border-purple-200/80 dark:border-purple-800/40"
    },
    "queue_recalled_v2": {
        bg: "bg-teal-500",
        text: "text-teal-600 dark:text-teal-400",
        lightBg: "bg-teal-50 dark:bg-teal-950/40",
        border: "border-teal-200/80 dark:border-teal-800/40"
    },
    "queue_removed_v3": {
        bg: "bg-rose-500",
        text: "text-rose-600 dark:text-rose-400",
        lightBg: "bg-rose-50 dark:bg-rose-950/40",
        border: "border-rose-200/80 dark:border-rose-800/40"
    },
    "appointment_booked_v1": {
        bg: "bg-indigo-500",
        text: "text-indigo-600 dark:text-indigo-400",
        lightBg: "bg-indigo-50 dark:bg-indigo-950/40",
        border: "border-indigo-200/80 dark:border-indigo-800/40"
    },
    "test": {
        bg: "bg-emerald-500",
        text: "text-emerald-600 dark:text-emerald-400",
        lightBg: "bg-emerald-50 dark:bg-emerald-950/40",
        border: "border-emerald-200/80 dark:border-emerald-800/40"
    },
};

const EVENT_TOKENS: Record<string, string[]> = {
    "queue_joined_v4": ["customer_name", "ticket_number", "people_ahead", "track_url", "live_url", "branch_name", "queue_name"],
    "queue_nearby_5_v3": ["ticket_number", "people_ahead", "track_url"],
    "queue_nearby_3_v3": ["ticket_number", "queue_name", "people_ahead"],
    "queue_called_v3": ["counter_name", "ticket_number", "queue_name"],
    "queue_completed_v3": ["ticket_number", "queue_name"],
    "queue_skipped_v3": ["counter_name", "ticket_number", "queue_name"],
    "queue_recalled_v2": ["counter_name", "ticket_number", "queue_name"],
    "queue_removed_v3": ["ticket_number", "queue_name"],
    "appointment_booked_v1": ["customer_name", "booking_ref", "location_name", "service_name", "appointment_date", "time_slot", "pass_url"],
    "test": ["meta_cloud_api"],
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
    "appointment_booked_v1",
];

const SAMPLE_MESSAGES: Record<string, { title: string; body: string; header?: string; footer?: string }> = {
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
    "appointment_booked_v1": {
        title: "Appointment Booking Confirmed",
        header: "Appointment Confirmed",
        body: "Greetings, *John Doe*!\n\n📅 Your appointment has been confirmed.\n\n🔖 *Booking Reference:* #APT-AS4579\n🏢 *Location:* Kerala (Calicut)\n📋 *Service:* General Consultation\n🗓️ *Date:* September 20, 2026\n⏰ *Time Slot:* 10:30 AM – 10:45 AM\n\n*View Live Appointment Pass:*\nhttps://q4queue.com/appointments/APT-AS4579\n\n_Please arrive 5–10 minutes before your time slot._",
        footer: "Powered by Q4Queue"
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

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case "delivered":
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/40">
                    <CheckCheck size={12} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>Delivered</span>
                </span>
            );
        case "read":
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/40">
                    <Eye size={12} className="shrink-0 text-blue-500" />
                    <span>Read</span>
                </span>
            );
        case "sent":
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/70 dark:border-sky-800/40">
                    <Check size={12} className="shrink-0 text-sky-500" />
                    <span>Sent</span>
                </span>
            );
        case "pending":
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/40">
                    <Clock size={12} className="shrink-0 text-amber-500" />
                    <span>Pending</span>
                </span>
            );
        case "failed":
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/70 dark:border-rose-800/40">
                    <AlertTriangle size={12} className="shrink-0 text-rose-500" />
                    <span>Failed</span>
                </span>
            );
        case "skipped":
        default:
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/70 dark:border-slate-700/50">
                    <X size={12} className="shrink-0 text-slate-500" />
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
    const { user, isReadOnly: authReadOnly } = useAuth();
    const isReadOnly = !!authReadOnly || user?.role === "super_admin" || user?.role === "organization_admin";
    const [activeTab, setActiveTab] = useState<"overview" | "history" | "settings">("overview");

    const [config, setConfig] = useState<WhatsAppOrgConfig | null>(null);
    const [sub, setSub] = useState<SubscriptionSummary | null>(null);
    const [stats, setStats] = useState<WhatsAppOrgStats | null>(null);
    const [eventStats, setEventStats] = useState<WhatsAppEventStat[]>([]);
    const [logs, setLogs] = useState<PaginatedWhatsAppMessages | null>(null);
    const [selectedMessage, setSelectedMessage] = useState<WhatsAppMessage | null>(null);
    const [queues, setQueues] = useState<QueueResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [copiedPayload, setCopiedPayload] = useState(false);

    // Interactive Preview selection state
    const [selectedPreviewEvent, setSelectedPreviewEvent] = useState<string>("queue_joined_v4");
    const [triggerCategory, setTriggerCategory] = useState<"all" | "entry" | "counter" | "exceptions">("all");
    const [copiedTemplate, setCopiedTemplate] = useState(false);

    const copyTemplateText = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedTemplate(true);
        toast.success("Message template copied to clipboard");
        setTimeout(() => setCopiedTemplate(false), 2000);
    };

    // Filters
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [filterQueueId, setFilterQueueId] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterEventType, setFilterEventType] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [limit, setLimit] = useState(10);
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
    }, [startDate, endDate, filterQueueId, filterStatus, filterEventType, debouncedSearchQuery, limit]);

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
            const [cfg, qs, s] = await Promise.all([
                api.getOrgWhatsAppConfig().catch(() => null),
                api.listQueues().catch(() => []),
                api.getSubscriptionSummary().catch(() => null),
            ]);
            if (cfg) setConfig(cfg);
            setQueues(qs || []);
            if (s) setSub(s);
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
                limit,
                offset: (currentPage - 1) * limit,
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
    }, [startDate, endDate, filterQueueId, filterStatus, filterEventType, debouncedSearchQuery, currentPage, limit]);

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

    const filteredEvents = useMemo(() => {
        if (triggerCategory === "all") return allEventsToDisplay;
        if (triggerCategory === "entry") {
            return allEventsToDisplay.filter(e => ["queue_joined_v4", "queue_nearby_5_v3", "queue_nearby_3_v3"].includes(e.event_type));
        }
        if (triggerCategory === "counter") {
            return allEventsToDisplay.filter(e => ["queue_called_v3", "queue_completed_v3", "queue_recalled_v2"].includes(e.event_type));
        }
        if (triggerCategory === "exceptions") {
            return allEventsToDisplay.filter(e => ["queue_skipped_v3", "queue_removed_v3"].includes(e.event_type));
        }
        return allEventsToDisplay;
    }, [allEventsToDisplay, triggerCategory]);

    const handleSettingChange = async (key: keyof WhatsAppOrgConfig, value: boolean) => {
        if (isReadOnly) return;
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
        if (isReadOnly) return;
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
        if (isReadOnly) return;
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
    const totalPages = logs ? Math.ceil(logs.total / limit) : 1;

    // Active Preview Template
    const rawPreview = SAMPLE_MESSAGES[selectedPreviewEvent] || SAMPLE_MESSAGES["queue_joined_v4"];
    const baseOrigin = typeof window !== "undefined" ? window.location.origin : "https://app.localhost:3000";
    const activePreview = {
        ...rawPreview,
        body: rawPreview.body.replace(/https:\/\/q4queue\.com/g, baseOrigin)
    };

    /* ─── Compact Filter Toolbar ──────────────────────────── */
    const FilterBar = () => (
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
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
            {(sub?.status === "trialing" || sub?.whatsapp_allowed === false) && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3.5 text-amber-900 dark:text-amber-200">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <h4 className="font-semibold text-sm">WhatsApp Notifications & Voice Calling Disabled in Free Trial</h4>
                        <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                            Outbound WhatsApp queue notifications and WebRTC voice calls are disabled during your Free Trial. Upgrade to a commercial subscription plan to enable automated messaging and voice calling for your customers.
                        </p>
                    </div>
                </div>
            )}
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
                            <MessageSquareText size={15} className="text-emerald-600 dark:text-emerald-400" />
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
                            <Phone size={15} className="text-indigo-500" />
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
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 pb-3 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap border-b-2 -mb-px ${
                                    isActive
                                        ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 dark:border-emerald-400"
                                        : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                                }`}
                            >
                                <Icon size={16} />
                                <span>{tab.label}</span>
                                {typeof tab.count === "number" && tab.count > 0 && (
                                    <span className={`px-2 py-0.5 rounded-full text-[11px] tabular-nums font-bold ${
                                        isActive
                                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
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

            {/* ══════════════════════════════════════════════
                2. TAB: STUDIO OVERVIEW (UNIFIED METRICS + SPLIT STUDIO)
            ══════════════════════════════════════════════ */}
            {activeTab === "overview" && (
                <div className="space-y-6">
                    <FilterBar />
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
                            {/* Card Header & Category Filter Tabs */}
                            <div className="px-5 sm:px-6 py-4 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/30">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                                                <Zap size={14} className="animate-pulse" />
                                            </div>
                                            <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">
                                                Queue Lifecycle Triggers & Delivery
                                            </h3>
                                        </div>
                                        <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1">
                                            Select an automated trigger below to view real-time delivery telemetry & live template simulation
                                        </p>
                                    </div>
                                    <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200/70 dark:border-emerald-800/40 tabular-nums self-start sm:self-auto shrink-0 shadow-2xs">
                                        {allEventsToDisplay.length} Automated Triggers
                                    </span>
                                </div>

                                {/* Category Filters */}
                                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-200/60 dark:border-white/5 overflow-x-auto">
                                    {[
                                        {
                                            id: "all",
                                            label: "All Triggers",
                                            count: allEventsToDisplay.length
                                        },
                                        {
                                            id: "entry",
                                            label: "Queue Entry & Alerts",
                                            count: allEventsToDisplay.filter(e => ["queue_joined_v4", "queue_nearby_5_v3", "queue_nearby_3_v3"].includes(e.event_type)).length
                                        },
                                        {
                                            id: "counter",
                                            label: "Counter Service",
                                            count: allEventsToDisplay.filter(e => ["queue_called_v3", "queue_completed_v3", "queue_recalled_v2"].includes(e.event_type)).length
                                        },
                                        {
                                            id: "exceptions",
                                            label: "Dispositions",
                                            count: allEventsToDisplay.filter(e => ["queue_skipped_v3", "queue_removed_v3"].includes(e.event_type)).length
                                        },
                                    ].map((cat) => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setTriggerCategory(cat.id as any)}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                                                triggerCategory === cat.id
                                                    ? "bg-emerald-600 text-white shadow-2xs"
                                                    : "bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200/70 dark:border-white/5"
                                            }`}
                                        >
                                            <span>{cat.label}</span>
                                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold tabular-nums ${
                                                triggerCategory === cat.id
                                                    ? "bg-white/20 text-white"
                                                    : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300"
                                            }`}>
                                                {cat.count}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Trigger Cards List */}
                            <div className="divide-y divide-slate-100 dark:divide-white/5">
                                {filteredEvents.map((s) => {
                                    const isSelected = selectedPreviewEvent === s.event_type;
                                    const theme = EVENT_THEME[s.event_type] || EVENT_THEME["queue_joined_v4"];
                                    const EventIcon = EVENT_ICON[s.event_type] || BellRing;
                                    const configKey = EVENT_TO_CONFIG_KEY[s.event_type];
                                    const isTriggerEnabled = configKey && config ? (config[configKey] ?? true) : true;

                                    return (
                                        <div
                                            key={s.event_type}
                                            onClick={() => setSelectedPreviewEvent(s.event_type)}
                                            className={`group p-4 sm:p-4.5 flex flex-col gap-3 transition-all cursor-pointer ${
                                                isSelected
                                                    ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-l-4 border-l-emerald-600 dark:border-l-emerald-500 shadow-2xs"
                                                    : "hover:bg-slate-50/80 dark:hover:bg-white/[0.02] border-l-4 border-l-transparent"
                                            }`}
                                        >
                                            {/* Top Row: Event Icon, Title, Config Toggle & Delivery % */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                                    {/* Event Squircle Icon */}
                                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 shadow-2xs ${theme.lightBg} ${theme.text} ${theme.border}`}>
                                                        <EventIcon size={17} strokeWidth={2.3} />
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-extrabold text-slate-900 dark:text-white text-[13.5px] group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                                                                {EVENT_LABEL[s.event_type] || s.event_type}
                                                            </span>

                                                            {isSelected && (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300/80 dark:border-emerald-700/60 shadow-2xs">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                                    <span>Previewing</span>
                                                                </span>
                                                            )}

                                                            {/* Direct Trigger Enable/Disable Action Pill */}
                                                            {configKey && config && (
                                                                <button
                                                                    type="button"
                                                                    disabled={isReadOnly}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (isReadOnly) return;
                                                                        handleSettingChange(configKey, !isTriggerEnabled);
                                                                    }}
                                                                    title={isReadOnly ? "Read-only view" : (isTriggerEnabled ? "Click to disable this WhatsApp trigger" : "Click to enable this WhatsApp trigger")}
                                                                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-bold border transition-all ${
                                                                        isReadOnly
                                                                            ? "opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-white/10"
                                                                            : isTriggerEnabled
                                                                            ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-emerald-400 dark:hover:border-emerald-500 cursor-pointer"
                                                                            : "bg-slate-100/50 dark:bg-slate-800/30 text-slate-400 border-slate-200/50 dark:border-white/5 opacity-70 cursor-pointer"
                                                                    }`}
                                                                >
                                                                    <span className={`w-1.5 h-1.5 rounded-full ${isTriggerEnabled ? "bg-emerald-500" : "bg-slate-400"}`} />
                                                                    <span>{isTriggerEnabled ? "Enabled" : "Paused"}</span>
                                                                </button>
                                                            )}
                                                        </div>

                                                        <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                                            {EVENT_DESCRIPTION[s.event_type] || "Automated queue event trigger"}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Delivery Rate Bar & Arrow Indicator */}
                                                <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
                                                    <div className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Delivery:</span>
                                                            <span className="text-[12.5px] font-black text-slate-900 dark:text-white tabular-nums">
                                                                {s.success_rate}%
                                                            </span>
                                                        </div>
                                                        <div className="w-18 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1 ml-auto">
                                                            <div
                                                                className="h-full rounded-full transition-all duration-300"
                                                                style={{
                                                                    width: `${s.success_rate}%`,
                                                                    backgroundColor: s.success_rate >= 90 ? '#10B981' : s.success_rate >= 50 ? '#F59E0B' : '#EF4444'
                                                                }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                                                        isSelected
                                                            ? "bg-emerald-600 text-white shadow-xs"
                                                            : "text-slate-300 group-hover:text-slate-600 group-hover:bg-slate-100 dark:text-slate-600 dark:group-hover:text-slate-300 dark:group-hover:bg-slate-800"
                                                    }`}>
                                                        <ChevronRight size={15} />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Bottom Row: Telemetry Micro-Pills */}
                                            <div className="flex items-center gap-2 pt-2 border-t border-slate-100/80 dark:border-white/5 flex-wrap text-[11px]">
                                                <span className="text-slate-400 font-medium">Activity:</span>

                                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold tabular-nums">
                                                    <Send size={11} className="text-slate-400" />
                                                    <span>Sent <strong className="text-slate-900 dark:text-white font-bold">{s.total}</strong></span>
                                                </div>

                                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 font-semibold tabular-nums">
                                                    <CheckCheck size={11} className="text-emerald-600" />
                                                    <span>Delivered <strong className="font-bold">{s.delivered}</strong></span>
                                                </div>

                                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40 font-semibold tabular-nums">
                                                    <Eye size={11} className="text-blue-600" />
                                                    <span>Read <strong className="font-bold">{s.read}</strong></span>
                                                </div>

                                                {s.failed > 0 && (
                                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40 font-semibold tabular-nums">
                                                        <AlertTriangle size={11} className="text-rose-600" />
                                                        <span>Failed <strong className="font-bold">{s.failed}</strong></span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* RIGHT: Live WhatsApp Mockup Studio & Quick Tester (5 Columns) */}
                        <div className="lg:col-span-5 space-y-4">
                            {/* Realistic Smartphone Device Mockup Container */}
                            <div className="bg-white dark:bg-slate-900/70 dark:backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                                {/* Studio Card Header */}
                                <div className="px-5 py-3.5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                                    <div className="flex items-center gap-2">
                                        <Smartphone size={15} className="text-emerald-600 dark:text-emerald-400" />
                                        <h4 className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                                            Live Studio Preview
                                        </h4>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => copyTemplateText(activePreview.body)}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg transition-all shadow-2xs cursor-pointer"
                                            title="Copy message text"
                                        >
                                            {copiedTemplate ? (
                                                <>
                                                    <Check size={12} className="text-emerald-600" />
                                                    <span className="text-emerald-600">Copied</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy size={12} />
                                                    <span>Copy</span>
                                                </>
                                            )}
                                        </button>
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/70 dark:border-emerald-800/40">
                                            <ShieldCheck size={11} />
                                            <span>Meta API</span>
                                        </span>
                                    </div>
                                </div>

                                {/* Smartphone Mockup Canvas */}
                                <div className="p-4 sm:p-5 bg-slate-100/60 dark:bg-slate-950/40 flex justify-center">
                                    <div className="w-full max-w-[360px] rounded-[28px] border-4 border-slate-800 dark:border-slate-700 bg-slate-900 shadow-xl overflow-hidden flex flex-col">
                                        {/* Phone Top Status Bar */}
                                        <div className="bg-[#008069] dark:bg-[#1F2C34] text-white px-5 pt-2 pb-1.5 flex items-center justify-between text-[11px] font-semibold select-none border-b border-black/10">
                                            <span>{fmtTime(new Date().toISOString(), tz, false)}</span>
                                            {/* Dynamic Camera Notch */}
                                            <div className="w-16 h-3.5 bg-black/80 rounded-full flex items-center justify-center">
                                                <span className="w-2 h-2 rounded-full bg-slate-800 border border-slate-700" />
                                            </div>
                                            <div className="flex items-center gap-1.5 text-white/90">
                                                <Wifi size={12} />
                                                <Battery size={13} />
                                            </div>
                                        </div>

                                        {/* WhatsApp App Header Bar */}
                                        <div className="bg-[#008069] dark:bg-[#1F2C34] text-white px-3.5 py-2.5 flex items-center justify-between border-b border-black/15 shadow-2xs">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="text-white/80 p-0.5">
                                                    <ArrowLeft size={16} />
                                                </div>
                                                {/* WhatsApp Business Avatar */}
                                                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-2xs">
                                                    <MessageSquareText size={15} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-bold text-[12.5px] text-white truncate">Q4Queue Updates</span>
                                                        <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-black shrink-0" title="Verified Business">
                                                            ✓
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] text-emerald-100/80 font-medium block truncate">Official Business Account</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 text-white/85 shrink-0">
                                                <Phone size={14} className="hover:text-white transition-colors cursor-pointer" />
                                                <MoreVertical size={15} className="hover:text-white transition-colors cursor-pointer" />
                                            </div>
                                        </div>

                                        {/* Authentic WhatsApp Wallpaper Canvas */}
                                        <WhatsAppWallpaperContainer className="p-3.5 min-h-[290px] flex flex-col justify-end">
                                            {/* Centered Date Pill */}
                                            <div className="flex justify-center mb-3">
                                                <div className="px-3 py-0.5 rounded-md bg-white/90 dark:bg-[#182229]/95 text-[#54656F] dark:text-[#8696A0] text-[10px] font-semibold uppercase tracking-wider shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] border border-slate-200/50 dark:border-white/5">
                                                    Today
                                                </div>
                                            </div>

                                            {/* WhatsApp Chat Bubble with Official Tail */}
                                            <div className="relative self-end max-w-[94%] bg-[#D9FDD3] dark:bg-[#005C4B] rounded-2xl rounded-tr-xs p-3.5 space-y-1.5 border border-[#b8e7b1]/60 dark:border-[#00483A] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
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
                                                <div className="font-bold text-[#008069] dark:text-[#25D366] text-[11px] pb-1 border-b border-[#b8e7b1]/70 dark:border-white/10 flex items-center justify-between gap-2">
                                                    <span className="truncate">{activePreview.title}</span>
                                                    <span className="text-[9.5px] uppercase tracking-wider font-semibold text-[#008069]/70 dark:text-[#25D366]/70">Automated</span>
                                                </div>

                                                {/* WhatsApp Official Header Component */}
                                                {activePreview.header && (
                                                    <div className="font-black text-[13px] text-slate-900 dark:text-white pt-1">
                                                        {activePreview.header}
                                                    </div>
                                                )}

                                                {/* Message Body Content */}
                                                <div>
                                                    {renderWhatsAppText(activePreview.body)}
                                                </div>

                                                {/* WhatsApp Official Footer Component */}
                                                {activePreview.footer && (
                                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium pt-1 select-none">
                                                        {activePreview.footer}
                                                    </div>
                                                )}

                                                {/* Timestamp & Double Blue Read Checks */}
                                                <div className="flex items-center justify-end gap-1 pt-1 text-[10px] text-[#667781] dark:text-[#8696A0]">
                                                    <span>{fmtTime(new Date().toISOString(), tz, false)}</span>
                                                    <CheckCheck size={15} className="text-[#53BDEB]" />
                                                </div>
                                            </div>
                                        </WhatsAppWallpaperContainer>

                                        {/* Bottom Home Indicator Bar */}
                                        <div className="bg-white dark:bg-slate-900 py-1.5 flex justify-center">
                                            <div className="w-24 h-1 bg-slate-400 dark:bg-slate-600 rounded-full" />
                                        </div>
                                    </div>
                                </div>

                                {/* Dynamic Variable Parameters Strip */}
                                {(EVENT_TOKENS[selectedPreviewEvent] || []).length > 0 && (
                                    <div className="px-5 py-3 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-slate-800/20">
                                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                                            <Zap size={12} className="text-amber-500" />
                                            <span>Dynamic Placeholders Injected:</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {(EVENT_TOKENS[selectedPreviewEvent] || []).map((tok) => (
                                                <span
                                                    key={tok}
                                                    className="px-2 py-0.5 rounded-md text-[10.5px] font-mono font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 shadow-2xs"
                                                >
                                                    {"{{" + tok + "}}"}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Quick Live Test Notification Sender */}
                            <div className="bg-white dark:bg-slate-900/70 dark:backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/10 p-5 shadow-xs space-y-3.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800/40">
                                            <Send size={13} />
                                        </div>
                                        <div>
                                            <h4 className="font-extrabold text-[13px] text-slate-900 dark:text-white">
                                                Send Live WhatsApp Test
                                            </h4>
                                            <p className="text-[11.5px] text-slate-500 dark:text-slate-400">
                                                Verify Meta Cloud API connectivity directly on your phone
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Live Ping
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="tel"
                                            disabled={isReadOnly}
                                            placeholder={isReadOnly ? "Test dispatch disabled in read-only view" : "+919876543210"}
                                            value={testPhone}
                                            onChange={e => { setTestPhone(e.target.value); setTestMsg(null); }}
                                            className="w-full h-10 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 rounded-xl pl-9 pr-3 text-[12.5px] font-mono text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={sendTest}
                                        disabled={isReadOnly || sendingTest || !testPhone}
                                        title={isReadOnly ? "Disabled in read-only view" : undefined}
                                        className="h-10 px-4.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[12px] font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 disabled:cursor-not-allowed cursor-pointer shrink-0 shadow-2xs"
                                    >
                                        <Send size={13} />
                                        <span>{sendingTest ? "Sending..." : "Dispatch Test"}</span>
                                    </button>
                                </div>

                                {testMsg && (
                                    <div className={`p-3 rounded-xl text-[12px] font-medium border flex items-start gap-2.5 animate-in fade-in duration-200 ${
                                        testMsg.type === "success"
                                            ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800/50"
                                            : "bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200/70 dark:border-rose-800/50"
                                    }`}>
                                        {testMsg.type === "success" ? (
                                            <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                                        ) : (
                                            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-rose-600" />
                                        )}
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
                <div className="space-y-4">
                    <FilterBar />
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
                        <table className="w-full text-left border-collapse min-w-[950px]">
                            <thead className="bg-slate-50/80 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 text-[11px] uppercase tracking-wider font-semibold border-b border-slate-100 dark:border-white/5">
                                <tr>
                                    <th className="px-6 py-3.5 whitespace-nowrap w-[240px]">Customer</th>
                                    <th className="px-6 py-3.5 whitespace-nowrap w-[200px]">Event Trigger</th>
                                    <th className="px-6 py-3.5 whitespace-nowrap w-[130px]">Status</th>
                                    <th className="px-6 py-3.5 whitespace-nowrap w-[170px]">Date & Time</th>
                                    <th className="px-6 py-3.5 whitespace-nowrap w-[130px] text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {logs?.items.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-16 text-center">
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
                                        className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors cursor-pointer group"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center border border-slate-200/60 dark:border-white/5 shrink-0">
                                                    {(m.customer_name || "U").substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-semibold text-slate-900 dark:text-white text-sm truncate max-w-[160px]">
                                                        {m.customer_name || "Walk-in Customer"}
                                                    </div>
                                                    <div className="tabular-nums font-mono text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                                                        {m.customer_phone}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 max-w-[180px] truncate border border-slate-200/50 dark:border-slate-700/50">
                                                {EVENT_LABEL[m.event_type || ""] || m.event_type || "—"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <StatusBadge status={m.status} />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-slate-900 dark:text-white text-xs">{fmtDate(m.sent_at, tz)}</div>
                                            <div className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums mt-0.5">{fmtTime(m.sent_at, tz)}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); setSelectedMessage(m); }}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200/70 dark:border-emerald-800/40 transition-all cursor-pointer shadow-2xs"
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

                    {/* Pagination Footer */}
                    {logs && logs.total > 0 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/40 dark:bg-slate-900/40">
                            {/* Showing X to Y of Z & Rows per page */}
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                <span>
                                    Showing <span className="font-semibold text-slate-900 dark:text-white">{((currentPage - 1) * limit) + 1}</span> to{" "}
                                    <span className="font-semibold text-slate-900 dark:text-white">{Math.min(currentPage * limit, logs.total)}</span> of{" "}
                                    <span className="font-semibold text-slate-900 dark:text-white">{logs.total}</span> messages
                                </span>

                                <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200 dark:border-white/10">
                                    <span className="text-slate-400">Per page:</span>
                                    <select
                                        value={limit}
                                        onChange={(e) => {
                                            setLimit(Number(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer shadow-2xs"
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
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1 || loading}
                                    title="Previous Page"
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs cursor-pointer"
                                >
                                    <ChevronLeft size={14} />
                                    <span className="hidden sm:inline">Previous</span>
                                </button>

                                <div className="flex items-center gap-1">
                                    {getPaginationPages(currentPage, Math.max(1, Math.ceil(logs.total / limit))).map((p, idx) =>
                                        p === "..." ? (
                                            <span key={`ellipsis-${idx}`} className="px-1.5 text-xs text-slate-400 font-bold">
                                                …
                                            </span>
                                        ) : (
                                            <button
                                                key={`page-${p}`}
                                                type="button"
                                                onClick={() => setCurrentPage(Number(p))}
                                                disabled={loading}
                                                className={`min-w-[32px] h-8 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                                    currentPage === p
                                                        ? "bg-emerald-600 text-white shadow-xs"
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
                                        const totalPages = Math.max(1, Math.ceil(logs.total / limit));
                                        setCurrentPage((p) => Math.min(totalPages, p + 1));
                                    }}
                                    disabled={currentPage >= Math.ceil(logs.total / limit) || loading}
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
                </div>
            )}

            {/* ══════════════════════════════════════════════
                4. TAB: NOTIFICATION TRIGGER SETTINGS
            ══════════════════════════════════════════════ */}
            {activeTab === "settings" && (
                <div className="space-y-6 animate-in fade-in duration-200 max-w-4xl">
                    {isReadOnly && (
                        <div className="px-4 py-3 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/40 text-violet-800 dark:text-violet-300 text-xs font-semibold flex items-center gap-2">
                            <Eye size={14} className="shrink-0 text-violet-600 dark:text-violet-400" />
                            <span>Read-Only View: Trigger toggles and test notifications cannot be modified in parent admin view.</span>
                        </div>
                    )}
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
                        <label className={`flex items-center gap-3 shrink-0 ${isReadOnly ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
                            <div
                                onClick={() => { if (!isReadOnly) handleSettingChange("is_enabled", !(config?.is_enabled ?? true)); }}
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
                                    disabled={isReadOnly || updatingSettings}
                                    className="px-3.5 py-1.5 text-[12px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-xl transition-colors border border-emerald-200/70 dark:border-emerald-800/40 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    Enable All
                                </button>
                                <button
                                    onClick={() => handleEnableAll(false)}
                                    disabled={isReadOnly || updatingSettings}
                                    className="px-3.5 py-1.5 text-[12px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200/80 dark:border-white/5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
                                            onClick={() => { if (!isReadOnly) handleSettingChange(setting.key as keyof WhatsAppOrgConfig, !isEnabled); }}
                                            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ${isReadOnly ? "opacity-60 cursor-not-allowed" : "cursor-pointer"} ${isEnabled ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"}`}
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
