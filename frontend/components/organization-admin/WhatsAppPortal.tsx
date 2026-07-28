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
    SessionResponse
} from "@/types/api";
import { 
    MessageSquareText, 
    Settings, 
    LayoutDashboard, 
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
    XCircle,
    BellRing,
    Search
} from "lucide-react";

const STATUS_ICON = {
    pending: "⏳",
    sent: "✓",
    delivered: "✓✓",
    read: "👁",
    failed: "✗",
    skipped: "∅",
};

const STATUS_COLOR: Record<string, string> = {
    pending: "#94a3b8",
    sent: "#38bdf8",
    delivered: "#34d399",
    read: "#818cf8",
    failed: "#f87171",
    skipped: "#64748b",
};

const EVENT_LABEL: Record<string, string> = {
    "queue_joined_v4": "Joined Queue",
    "queue_nearby_5_v3": "Position 5 Warning",
    "queue_nearby_3_v3": "Position 3 Warning (Turn is Near)",
    "queue_called_v3": "Called to Counter",
    "queue_completed_v3": "Completed",
    "queue_skipped_v3": "Skipped",
    "queue_removed_v3": "Removed",
    "queue_recalled_v2": "Recalled",
    
    // Legacy Events (Keep for historical logs but map to clean names to aggregate seamlessly)
    "queue_nearby_5_v2": "Position 5 Warning",
    "queue_nearby_3_v2": "Position 3 Warning (Turn is Near)",
    "queue_called_v2": "Called to Counter",
    "queue_completed_v2": "Completed",
    "queue_skipped_v2": "Skipped",
    "queue_removed_v2": "Removed",
    "queue_joined_v2": "Joined Queue",
    "queue_position_v2": "Position Warning",
    "queue_served_v2": "Called to Counter",
    "test": "Test",
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

function fmtTime(iso?: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString();
}

function StatCard({ label, value, color, icon: Icon, trend }: { label: string; value: number | string; color: string; icon: any; trend?: string }) {
    return (
        <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl rounded-[16px] border border-[#E9EDF5] dark:border-white/10 p-5 shadow-sm flex flex-col justify-between h-full">
            <div className="flex items-start justify-between mb-4">
                <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center bg-opacity-10" 
                    style={{ backgroundColor: `${color}15`, color }}
                >
                    <Icon size={20} strokeWidth={2.5} />
                </div>
                {trend && (
                    <span className="text-[11px] font-bold tracking-wider px-2 py-1 rounded-md bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-white/10">
                        {trend}
                    </span>
                )}
            </div>
            <div>
                <div className="text-[28px] font-bold tracking-tight text-slate-900 dark:text-white leading-none mb-1.5" style={{ color }}>
                    {value}
                </div>
                <div className="text-[13px] font-medium text-[#6B7280] dark:text-slate-400">
                    {label}
                </div>
            </div>
        </div>
    );
}

export function WhatsAppPortal() {
    const [activeTab, setActiveTab] = useState<"overview" | "history" | "settings">("overview");

    const [config, setConfig] = useState<WhatsAppOrgConfig | null>(null);
    const [stats, setStats] = useState<WhatsAppOrgStats | null>(null);
    const [eventStats, setEventStats] = useState<WhatsAppEventStat[]>([]);
    const [logs, setLogs] = useState<PaginatedWhatsAppMessages | null>(null);
    const [selectedMessage, setSelectedMessage] = useState<WhatsAppMessage | null>(null);
    const [queues, setQueues] = useState<QueueResponse[]>([]);
    const [sessions, setSessions] = useState<SessionResponse[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [filterQueueId, setFilterQueueId] = useState("");
    const [filterSessionId, setFilterSessionId] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterEventType, setFilterEventType] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Reset pagination on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [startDate, endDate, filterQueueId, filterSessionId, filterStatus, filterEventType, debouncedSearchQuery]);

    // Settings state
    const [testPhone, setTestPhone] = useState("");
    const [sendingTest, setSendingTest] = useState(false);
    const [testMsg, setTestMsg] = useState("");

    const loadInitialData = useCallback(async () => {
        try {
            const [cfg, qs, ss] = await Promise.all([
                api.getOrgWhatsAppConfig().catch(() => null),
                api.listQueues().catch(() => []),
                api.listSessions(100).catch(() => ({ items: [] as SessionResponse[] })),
            ]);
            if (cfg) setConfig(cfg);
            setQueues(qs || []);
            setSessions(ss?.items || []);
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
                sessionId: filterSessionId || undefined,
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
    }, [startDate, endDate, filterQueueId, filterSessionId, filterStatus, filterEventType, debouncedSearchQuery, currentPage]);

    useEffect(() => { 
        loadFilteredData();
    }, [loadFilteredData]);

    const allEventsToDisplay = useMemo(() => {
        const aggregated: Record<string, WhatsAppEventStat> = {};
        
        // Initialize with ACTIVE_EVENTS to keep order
        ACTIVE_EVENTS.forEach(eventKey => {
            const label = EVENT_LABEL[eventKey] || eventKey;
            aggregated[label] = {
                event_type: eventKey, // Use active key for underlying ID if needed
                total: 0,
                delivered: 0,
                read: 0,
                failed: 0,
                success_rate: 0
            };
        });

        // Aggregate actual stats from backend
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

    useEffect(() => {
        loadInitialData(); 
    }, [loadInitialData]);

    useEffect(() => { 
        loadFilteredData(); 
    }, [loadFilteredData]);

    const handleSettingChange = async (key: keyof WhatsAppOrgConfig, value: boolean) => {
        if (!config) return;
        const previousConfig = { ...config };
        setConfig({ ...config, [key]: value });
        try {
            await api.setOrgWhatsAppEnabled({ [key]: value });
        } catch {
            alert("Failed to update setting");
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
        try {
            await api.setOrgWhatsAppEnabled(updated);
        } catch {
            alert("Failed to update settings");
            setConfig(previousConfig);
        }
    };

    const sendTest = async () => {
        if (!testPhone.trim() || !testPhone.startsWith("+")) {
            setTestMsg("Please enter a valid E.164 number (e.g. +1234567890)");
            return;
        }
        setSendingTest(true);
        setTestMsg("");
        try {
            await api.sendWhatsAppTestNotification(testPhone);
            setTestMsg("✓ Test message queued successfully");
            setTimeout(loadFilteredData, 2000);
        } catch {
            setTestMsg("✗ Failed to send test message");
        } finally {
            setSendingTest(false);
        }
    };

    const tabs = [
        { id: "overview", label: "Overview" },
        { id: "history", label: "Message History" },
        { id: "settings", label: "Settings" }
    ];

    const TAB_ICONS: Record<string, React.ElementType> = {
        overview: BarChart3,
        history: MessageSquareText,
        settings: Settings
    };

    if (loading && !config && !stats) {
        return <div className="text-center p-12 text-slate-500 font-medium">Loading WhatsApp analytics...</div>;
    }

    if (config && (config as any).plan_enabled === false) {
        return (
            <div className="space-y-6 w-full pb-12 bg-transparent min-h-screen">
                <div className="bg-white dark:bg-slate-900/60 rounded-[24px] p-12 shadow-sm border border-[#E9EDF5] dark:border-white/10 text-center max-w-2xl mx-auto mt-12">
                    <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <MessageSquareText size={32} className="text-amber-500" strokeWidth={1.5} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">WhatsApp Messaging is Not Included in Your Plan</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-6">
                        Your organization does not currently have WhatsApp notification support enabled. If you would like to enable automated WhatsApp updates for your queue customers, please contact the Q4Queue support team.
                    </p>
                    <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs border border-slate-200 dark:border-slate-700">
                        <span>Need WhatsApp Support? Contact Q4Queue Support</span>
                    </div>
                </div>
            </div>
        );
    }


    return (
        <div className="space-y-6 w-full pb-12 bg-transparent min-h-screen">
            {/* Hero Section */}
            <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl rounded-[24px] p-8 shadow-sm border border-[#E9EDF5] dark:border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/50 dark:from-indigo-950/20 via-white dark:via-transparent to-white dark:to-transparent opacity-60 pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-2xl font-bold text-[#111827] dark:text-white tracking-tight mb-2">
                            Communication Hub
                        </h1>
                        <p className="text-[14px] text-[#6B7280] dark:text-slate-400">
                            Manage WhatsApp notifications, delivery analytics and messaging settings for this branch.
                        </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-3 bg-[#F7F9FC] dark:bg-slate-800/60 px-4 py-3 rounded-2xl border border-[#E9EDF5] dark:border-white/10">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center">
                            <MessageSquareText size={20} className="text-emerald-500 dark:text-emerald-400" strokeWidth={2} />
                        </div>
                        <div>
                            <div className="text-[14px] font-bold text-[#111827] dark:text-white">WhatsApp</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span className="text-[12px] font-medium text-emerald-600 dark:text-emerald-400">Connected</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sub-header & Tabs */}
            <div className="pt-2 pb-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center">
                        <BellRing size={16} className="text-indigo-500 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-[#111827] dark:text-white">WhatsApp Analytics & Settings</h2>
                        <p className="text-[12px] text-[#6B7280] dark:text-slate-400">Monitor message delivery and configure notifications for your organization.</p>
                    </div>
                </div>

                <div className="flex border-b border-[#E9EDF5] dark:border-white/10 mt-6 gap-8">
                    {tabs.map((tab) => {
                        const Icon = TAB_ICONS[tab.id];
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`pb-3 text-[14px] font-semibold transition-all duration-200 border-b-2 flex items-center gap-2 ${
                                    isActive 
                                    ? "border-[#2563EB] dark:border-indigo-400 text-[#2563EB] dark:text-indigo-400" 
                                    : "border-transparent text-[#6B7280] dark:text-slate-400 hover:text-[#111827] dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700"
                                }`}
                            >
                                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div>
                {activeTab === "overview" && (
                    <div className="space-y-6">
                        {/* Premium Filter Card */}
                        <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl p-5 rounded-[16px] shadow-sm border border-[#E9EDF5] dark:border-white/10 flex flex-col lg:flex-row gap-4 items-end">
                            <div className="flex-1 w-full relative">
                                <label className="block text-[10px] font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider mb-1.5">Start Date</label>
                                <div className="relative">
                                    <input 
                                        type="date" 
                                        value={startDate} 
                                        onChange={e => setStartDate(e.target.value)}
                                        className="w-full h-11 bg-[#F7F9FC] dark:bg-slate-800/60 border border-[#E9EDF5] dark:border-white/10 rounded-xl pl-10 pr-4 text-[13px] font-medium text-[#111827] dark:text-slate-200 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all dark:scheme-dark"
                                    />
                                    <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] dark:text-slate-500" />
                                </div>
                            </div>
                            <div className="flex-1 w-full relative">
                                <label className="block text-[10px] font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider mb-1.5">End Date</label>
                                <div className="relative">
                                    <input 
                                        type="date" 
                                        value={endDate} 
                                        onChange={e => setEndDate(e.target.value)}
                                        className="w-full h-11 bg-[#F7F9FC] dark:bg-slate-800/60 border border-[#E9EDF5] dark:border-white/10 rounded-xl pl-10 pr-4 text-[13px] font-medium text-[#111827] dark:text-slate-200 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all dark:scheme-dark"
                                    />
                                    <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] dark:text-slate-500" />
                                </div>
                            </div>
                            <div className="flex-1 w-full relative">
                                <label className="block text-[10px] font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider mb-1.5">Queue</label>
                                <div className="relative">
                                    <select 
                                        value={filterQueueId} 
                                        onChange={e => setFilterQueueId(e.target.value)}
                                        className="w-full h-11 bg-[#F7F9FC] dark:bg-slate-800/60 border border-[#E9EDF5] dark:border-white/10 rounded-xl pl-4 pr-10 text-[13px] font-medium text-[#111827] dark:text-slate-200 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all appearance-none"
                                    >
                                        <option value="" className="dark:bg-slate-900">All Queues</option>
                                        {queues.map(q => <option key={q.id} value={q.id} className="dark:bg-slate-900">{q.name}</option>)}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] dark:text-slate-500 pointer-events-none" />
                                </div>
                            </div>
                            <div className="flex-1 w-full relative">
                                <label className="block text-[10px] font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider mb-1.5">Session</label>
                                <div className="relative">
                                    <select 
                                        value={filterSessionId} 
                                        onChange={e => setFilterSessionId(e.target.value)}
                                        className="w-full h-11 bg-[#F7F9FC] dark:bg-slate-800/60 border border-[#E9EDF5] dark:border-white/10 rounded-xl pl-4 pr-10 text-[13px] font-medium text-[#111827] dark:text-slate-200 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all appearance-none"
                                    >
                                        <option value="" className="dark:bg-slate-900">All Sessions</option>
                                        {sessions.map(s => <option key={s.id} value={s.id} className="dark:bg-slate-900">{new Date(s.session_date).toLocaleDateString()}</option>)}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] dark:text-slate-500 pointer-events-none" />
                                </div>
                            </div>
                            <button 
                                onClick={() => { setStartDate(""); setEndDate(""); setFilterQueueId(""); setFilterSessionId(""); }}
                                className="h-11 px-5 flex items-center justify-center gap-2 text-[13px] font-semibold text-[#6366F1] dark:text-indigo-400 bg-[#6366F1]/5 dark:bg-indigo-500/10 hover:bg-[#6366F1]/10 dark:hover:bg-indigo-500/20 rounded-xl transition-colors whitespace-nowrap border border-transparent"
                            >
                                <FilterX size={16} />
                                Clear Filters
                            </button>
                        </div>

                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
                            <StatCard label="Total Sent" value={stats?.total ?? 0} color="#6366F1" icon={Send} />
                            <StatCard label="Delivered" value={stats?.delivered ?? 0} color="#10B981" icon={CheckCircle2} />
                            <StatCard label="Read" value={stats?.read ?? 0} color="#2563EB" icon={Eye} />
                            <StatCard label="Failed" value={stats?.failed ?? 0} color="#EF4444" icon={AlertTriangle} />
                            <StatCard label="Success Rate" value={`${stats?.success_rate ?? 0}%`} color="#F59E0B" icon={TrendingUp} />
                        </div>

                        {/* Events Table */}
                        <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl rounded-[24px] border border-[#E9EDF5] dark:border-white/10 overflow-hidden shadow-sm">
                            <div className="px-6 py-5 border-b border-[#E9EDF5] dark:border-white/10 bg-white dark:bg-slate-900/40 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center">
                                    <BarChart3 size={16} className="text-indigo-500 dark:text-indigo-400" strokeWidth={2.5} />
                                </div>
                                <h3 className="font-bold text-[#111827] dark:text-white text-[16px]">Performance By Event Type</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-[14px]">
                                    <thead className="bg-[#F7F9FC] dark:bg-slate-800/50 text-[#6B7280] dark:text-slate-400 text-[11px] uppercase tracking-wider font-bold">
                                        <tr>
                                            <th className="px-6 py-4">Event Type</th>
                                            <th className="px-6 py-4">Total Sent</th>
                                            <th className="px-6 py-4">Delivered</th>
                                            <th className="px-6 py-4">Read</th>
                                            <th className="px-6 py-4">Failed</th>
                                            <th className="px-6 py-4">Success Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E9EDF5] dark:divide-white/10 text-[#111827] dark:text-slate-200">
                                        {allEventsToDisplay.length === 0 ? (
                                            <tr><td colSpan={6} className="px-6 py-12 text-center text-[#6B7280] dark:text-slate-400 font-medium">No data available for these filters.</td></tr>
                                        ) : allEventsToDisplay.map((s, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors duration-200">
                                                <td className="px-6 py-4 font-semibold flex items-center gap-3 text-[#111827] dark:text-slate-200">
                                                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                                    {EVENT_LABEL[s.event_type] || s.event_type}
                                                </td>
                                                <td className="px-6 py-4 font-semibold text-[#111827] dark:text-white">{s.total}</td>
                                                <td className="px-6 py-4 text-emerald-500 dark:text-emerald-400 font-semibold">{s.delivered}</td>
                                                <td className="px-6 py-4 text-blue-600 dark:text-blue-400 font-semibold">{s.read}</td>
                                                <td className="px-6 py-4 text-red-500 dark:text-red-400 font-semibold">{s.failed}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-24 h-1.5 bg-[#F7F9FC] dark:bg-slate-800 border border-[#E9EDF5] dark:border-white/10 rounded-full overflow-hidden">
                                                            <div className="h-full bg-slate-300 rounded-full transition-all duration-500" style={{ width: `${s.success_rate}%`, backgroundColor: s.success_rate >= 90 ? '#10B981' : s.success_rate >= 50 ? '#F59E0B' : '#EF4444' }}></div>
                                                        </div>
                                                        <span className="font-bold text-[#111827] dark:text-white text-[13px]">{s.success_rate}%</span>
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

                {activeTab === "history" && (
                    <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl rounded-[24px] border border-[#E9EDF5] dark:border-white/10 overflow-hidden shadow-sm">
                        <div className="p-5 border-b border-[#E9EDF5] dark:border-white/10 bg-white dark:bg-slate-900/40 flex flex-col sm:flex-row gap-4 items-center">
                            <div className="flex-1 w-full relative">
                                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] dark:text-slate-500" />
                                <input type="text" placeholder="Search by name or phone..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full h-11 bg-[#F7F9FC] dark:bg-slate-800/60 border border-[#E9EDF5] dark:border-white/10 rounded-xl pl-10 pr-4 text-[13px] font-medium text-[#111827] dark:text-slate-200 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-[#6B7280] dark:placeholder:text-slate-500" />
                            </div>
                            <div className="relative w-full sm:w-auto">
                                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full sm:w-auto h-11 bg-[#F7F9FC] dark:bg-slate-800/60 border border-[#E9EDF5] dark:border-white/10 rounded-xl pl-4 pr-10 text-[13px] font-medium text-[#111827] dark:text-slate-200 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all appearance-none">
                                    <option value="" className="dark:bg-slate-900">All Statuses</option>
                                    <option value="pending" className="dark:bg-slate-900">Pending</option>
                                    <option value="sent" className="dark:bg-slate-900">Sent</option>
                                    <option value="delivered" className="dark:bg-slate-900">Delivered</option>
                                    <option value="read" className="dark:bg-slate-900">Read</option>
                                    <option value="failed" className="dark:bg-slate-900">Failed</option>
                                    <option value="skipped" className="dark:bg-slate-900">Skipped</option>
                                </select>
                                <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] dark:text-slate-500 pointer-events-none" />
                            </div>
                            <div className="relative w-full sm:w-auto">
                                <select value={filterEventType} onChange={e => setFilterEventType(e.target.value)} className="w-full sm:w-auto h-11 bg-[#F7F9FC] dark:bg-slate-800/60 border border-[#E9EDF5] dark:border-white/10 rounded-xl pl-4 pr-10 text-[13px] font-medium text-[#111827] dark:text-slate-200 focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none transition-all appearance-none">
                                    <option value="" className="dark:bg-slate-900">All Events</option>
                                    {ACTIVE_EVENTS.map(ev => <option key={ev} value={ev} className="dark:bg-slate-900">{EVENT_LABEL[ev] || ev}</option>)}
                                </select>
                                <ChevronDown size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] dark:text-slate-500 pointer-events-none" />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-[14px]">
                                <thead className="bg-[#F7F9FC] dark:bg-slate-800/50 text-[#6B7280] dark:text-slate-400 text-[11px] uppercase tracking-wider font-bold">
                                    <tr>
                                        <th className="px-6 py-4">Customer / Phone</th>
                                        <th className="px-6 py-4">Event</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Timestamp</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E9EDF5] dark:divide-white/10 text-[#111827] dark:text-slate-200">
                                    {logs?.items.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-[#6B7280] dark:text-slate-400 font-medium">
                                                No messages sent yet.
                                            </td>
                                        </tr>
                                    ) : logs?.items.map((m: WhatsAppMessage) => (
                                        <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors duration-200">
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-[#111827] dark:text-white">{m.customer_name || "Unknown"}</div>
                                                <div className="font-mono text-[12px] text-[#6B7280] dark:text-slate-400 mt-1">{m.customer_phone}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="bg-[#F7F9FC] dark:bg-slate-800 text-[#6B7280] dark:text-slate-300 px-2.5 py-1 rounded-md text-[11px] font-bold border border-[#E9EDF5] dark:border-white/10">
                                                    {EVENT_LABEL[m.event_type || ""] || m.event_type || "—"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-bold flex items-center gap-1.5" style={{ color: STATUS_COLOR[m.status] || "#94a3b8" }}>
                                                    {STATUS_ICON[m.status as keyof typeof STATUS_ICON]} 
                                                    <span className="capitalize">{m.status === "skipped" ? "Skipped (No Opt-in)" : m.status}</span>
                                                </span>
                                                {m.error_message && (
                                                    <div className="text-[10px] text-red-500 dark:text-red-400 mt-1.5 max-w-[200px] truncate" title={m.error_message}>
                                                        {m.error_message}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-[#6B7280] dark:text-slate-400 text-[13px] font-medium">
                                                {fmtTime(m.sent_at)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => setSelectedMessage(m)}
                                                    className="inline-flex items-center justify-center p-2 rounded-xl text-[#6B7280] dark:text-slate-400 hover:text-[#2563EB] dark:hover:text-indigo-400 hover:bg-blue-50 dark:hover:bg-indigo-950/50 transition-colors duration-200"
                                                    title="View Details"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        {logs && logs.total > 50 && (
                            <div className="px-6 py-4 border-t border-[#E9EDF5] dark:border-white/10 flex items-center justify-between bg-white dark:bg-slate-900/40">
                                <div className="text-[13px] text-[#6B7280] dark:text-slate-400">
                                    Showing <span className="font-bold text-[#111827] dark:text-white">{(currentPage - 1) * 50 + 1}</span> to <span className="font-bold text-[#111827] dark:text-white">{Math.min(currentPage * 50, logs.total)}</span> of <span className="font-bold text-[#111827] dark:text-white">{logs.total}</span> entries
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="h-9 px-4 flex items-center justify-center text-[13px] font-semibold rounded-xl border border-[#E9EDF5] dark:border-white/10 bg-white dark:bg-slate-800 text-[#111827] dark:text-slate-200 hover:bg-[#F7F9FC] dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setCurrentPage(p => p + 1)}
                                        disabled={currentPage * 50 >= logs.total}
                                        className="h-9 px-4 flex items-center justify-center text-[13px] font-semibold rounded-xl border border-[#E9EDF5] dark:border-white/10 bg-white dark:bg-slate-800 text-[#111827] dark:text-slate-200 hover:bg-[#F7F9FC] dark:hover:bg-slate-700 disabled:opacity-50 transition-colors"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "settings" && (
                    <div className="max-w-4xl space-y-8">
                        {/* Global Enable */}
                        <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl rounded-[24px] border border-[#E9EDF5] dark:border-white/10 p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            <div>
                                <h2 className="text-lg font-bold text-[#111827] dark:text-white">Master Switch</h2>
                                <p className="text-[14px] text-[#6B7280] dark:text-slate-400 mt-1 max-w-lg">
                                    Toggle all WhatsApp notifications globally. If paused, NO messages will be sent to any customer.
                                </p>
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer shrink-0">
                                <div className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 ${config?.is_enabled ? "bg-[#10B981]" : "bg-[#E9EDF5] dark:bg-slate-800"}`}>
                                    <input type="checkbox" className="sr-only" checked={config?.is_enabled ?? true} onChange={(e) => handleSettingChange("is_enabled", e.target.checked)} />
                                    <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${config?.is_enabled ? "translate-x-7" : "translate-x-1"}`} />
                                </div>
                            </label>
                        </div>

                        <div className="grid grid-cols-1 gap-8">
                            {/* Notification Settings */}
                            <div className="bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl rounded-[24px] border border-[#E9EDF5] dark:border-white/10 shadow-sm overflow-hidden flex flex-col">
                                <div className="p-8 border-b border-[#E9EDF5] dark:border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div>
                                        <h2 className="text-base font-bold text-[#111827] dark:text-white mb-1">Notification Settings</h2>
                                        <p className="text-[14px] text-[#6B7280] dark:text-slate-400">Manage how notifications flow to your customers.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleEnableAll(true)}
                                            className="h-9 px-4 text-[13px] font-semibold text-[#10B981] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-950/80 rounded-xl transition-colors"
                                        >
                                            Enable All
                                        </button>
                                        <button
                                            onClick={() => handleEnableAll(false)}
                                            className="h-9 px-4 text-[13px] font-semibold text-[#6B7280] dark:text-slate-300 bg-[#F7F9FC] dark:bg-slate-800 hover:bg-[#E9EDF5] dark:hover:bg-slate-700 rounded-xl transition-colors border border-[#E9EDF5] dark:border-white/10"
                                        >
                                            Disable All
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="p-8 space-y-6 flex-1 bg-white dark:bg-slate-900/40">
                                    {/* Toggle Items */}
                                    <div className="divide-y divide-[#E9EDF5] dark:divide-white/10">
                                        {[
                                            {
                                                key: "notify_queue_joined",
                                                title: "Joined Queue",
                                                desc: "Alerts when customer is added. Includes opt-in live update prompt.",
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
                                                desc: "Alerts customer when exactly 3 people are ahead in the queue.",
                                                icon: AlertTriangle
                                            },
                                            {
                                                key: "notify_called",
                                                title: "Customer Called",
                                                desc: "Alerts customer to proceed to the counter.",
                                                icon: BellRing
                                            },
                                            {
                                                key: "notify_completed",
                                                title: "Service Completed",
                                                desc: "Sends a final thank-you message after completed service.",
                                                icon: Check
                                            },
                                            {
                                                key: "notify_skipped",
                                                title: "Token Skipped",
                                                desc: "Alerts customer when their token is skipped due to unavailability.",
                                                icon: XCircle
                                            },
                                            {
                                                key: "notify_recalled",
                                                title: "Token Recalled",
                                                desc: "Alerts customer when staff re-calls their previously-skipped token.",
                                                icon: TrendingUp
                                            },
                                            {
                                                key: "notify_removed",
                                                title: "Token Removed",
                                                desc: "Alerts customer when removed from queue by staff or self-cancellation.",
                                                icon: FilterX
                                            }
                                        ].map((setting) => (
                                            <div key={setting.key} className="py-6 flex items-start justify-between gap-4 group">
                                                <div className="flex gap-4">
                                                    <div className="mt-1 flex items-center justify-center w-10 h-10 rounded-xl bg-[#F7F9FC] dark:bg-slate-800 text-[#6B7280] dark:text-slate-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/50 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                                                        <setting.icon size={20} strokeWidth={2} />
                                                    </div>
                                                    <div>
                                                        <div className="text-[14px] font-bold text-[#111827] dark:text-white">{setting.title}</div>
                                                        <div className="text-[13px] text-[#6B7280] dark:text-slate-400 mt-1 leading-relaxed max-w-xl">{setting.desc}</div>
                                                    </div>
                                                </div>
                                                <div className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer duration-300 mt-2 ${config?.[setting.key as keyof WhatsAppOrgConfig] ? "bg-[#10B981]" : "bg-[#E9EDF5] dark:bg-slate-800"}`} onClick={() => handleSettingChange(setting.key as keyof WhatsAppOrgConfig, !(config?.[setting.key as keyof WhatsAppOrgConfig] ?? true))}>
                                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${config?.[setting.key as keyof WhatsAppOrgConfig] ? "translate-x-6" : "translate-x-1"}`} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {selectedMessage && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/60 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-[#E9EDF5] dark:border-white/10 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
                            <div className="px-8 py-6 border-b border-[#E9EDF5] dark:border-white/10 flex justify-between items-center bg-white dark:bg-slate-900">
                                <h3 className="font-bold text-[18px] text-[#111827] dark:text-white flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center">
                                        <MessageSquareText size={16} className="text-indigo-500 dark:text-indigo-400" strokeWidth={2.5} />
                                    </div>
                                    Message Log Details
                                </h3>
                                <button 
                                    onClick={() => setSelectedMessage(null)} 
                                    className="w-8 h-8 flex items-center justify-center text-[#6B7280] dark:text-slate-400 hover:text-[#111827] dark:hover:text-white hover:bg-[#F7F9FC] dark:hover:bg-slate-800 rounded-full transition-colors"
                                >
                                    <XCircle size={20} />
                                </button>
                            </div>
                            
                            <div className="p-8 overflow-y-auto space-y-8 bg-white dark:bg-slate-900">
                                <div className="grid grid-cols-2 gap-x-8 gap-y-6 bg-[#F7F9FC] dark:bg-slate-800/60 p-6 rounded-[16px] border border-[#E9EDF5] dark:border-white/10">
                                    <div>
                                        <div className="text-[10px] font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider">Customer</div>
                                        <div className="mt-1 font-bold text-[#111827] dark:text-white">{selectedMessage.customer_name || "Unknown"}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider">Phone</div>
                                        <div className="mt-1 font-mono text-[13px] text-[#6B7280] dark:text-slate-300">{selectedMessage.customer_phone}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider">Event</div>
                                        <div className="mt-2">
                                            <span className="bg-white dark:bg-slate-800 text-[#6B7280] dark:text-slate-300 px-3 py-1.5 rounded-md text-[11px] font-bold border border-[#E9EDF5] dark:border-white/10 shadow-sm">
                                                {EVENT_LABEL[selectedMessage.event_type || ""] || selectedMessage.event_type || "—"}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider">Status</div>
                                        <div className="mt-2 flex items-center gap-1.5 font-bold" style={{ color: STATUS_COLOR[selectedMessage.status] }}>
                                            {STATUS_ICON[selectedMessage.status as keyof typeof STATUS_ICON]} 
                                            <span className="capitalize">{selectedMessage.status === "skipped" ? "Skipped (No Opt-in)" : selectedMessage.status}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider">Timestamp</div>
                                        <div className="mt-1 text-[13px] text-[#111827] dark:text-white font-semibold">{fmtTime(selectedMessage.sent_at || selectedMessage.created_at)}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider">Meta Message ID</div>
                                        <div className="mt-1 text-[11px] font-mono text-[#6B7280] dark:text-slate-400 truncate" title={selectedMessage.meta_message_id || ""}>
                                            {selectedMessage.meta_message_id || "—"}
                                        </div>
                                    </div>
                                </div>
                                
                                {(selectedMessage.error_message || selectedMessage.error_code) && (
                                    <div>
                                        <div className="text-[11px] font-bold text-red-500 dark:text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <AlertTriangle size={14} />
                                            Error Details
                                        </div>
                                        <div className="p-5 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-300 rounded-[16px] text-[13px] whitespace-pre-wrap leading-relaxed">
                                            {selectedMessage.error_code && <div className="font-mono text-[11px] mb-2 font-bold bg-white/50 dark:bg-slate-800/50 inline-block px-2 py-1 rounded">Code: {selectedMessage.error_code}</div>}
                                            {selectedMessage.error_message}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <div className="text-[11px] font-bold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider mb-2">Message Payload</div>
                                    <div className="p-5 bg-[#111827] dark:bg-slate-950 rounded-[16px] overflow-hidden border border-transparent dark:border-white/10">
                                        <pre className="text-[12px] font-mono text-emerald-400 whitespace-pre-wrap overflow-x-auto leading-relaxed">
                                            {selectedMessage.rendered_body || JSON.stringify(selectedMessage.template_variables, null, 2) || "No payload logged"}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="px-8 py-5 border-t border-[#E9EDF5] dark:border-white/10 bg-white dark:bg-slate-900 flex justify-end">
                                <button 
                                    onClick={() => setSelectedMessage(null)}
                                    className="h-10 px-6 bg-white dark:bg-slate-800 border border-[#E9EDF5] dark:border-white/10 hover:bg-[#F7F9FC] dark:hover:bg-slate-700 text-[#111827] dark:text-white rounded-xl text-[14px] font-bold transition-colors shadow-sm"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
