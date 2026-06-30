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
    "queue_nearby_5_v2": "Position 5 Warning",
    "queue_nearby_3_v2": "Position 3 Warning (Turn is Near)",
    "queue_called_v2": "Called to Counter",
    "queue_completed_v2": "Completed",
    "queue_skipped_v2": "Skipped",
    "queue_removed_v2": "Removed",
    "queue_recalled_v2": "Recalled",
    "queue_joined_v2": "Joined (Legacy)",
    "queue_position_v2": "Position (Legacy)",
    "queue_served_v2": "Called (Legacy)",
    "test": "Test",
};

const ACTIVE_EVENTS = [
    "queue_joined_v4",
    "queue_nearby_5_v2",
    "queue_nearby_3_v2",
    "queue_called_v2",
    "queue_completed_v2",
    "queue_skipped_v2",
    "queue_removed_v2",
    "queue_recalled_v2",
];

function fmtTime(iso?: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString();
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="text-3xl font-bold tracking-tight" style={{ color }}>{value}</div>
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">{label}</div>
        </div>
    );
}

export default function OrgWhatsAppDashboard() {
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

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 500);
        return () => clearTimeout(handler);
    }, [searchQuery]);

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
            };

            const [st, events, history] = await Promise.all([
                api.getOrgWhatsAppStats(params).catch(() => null),
                api.getOrgWhatsAppEventStats(params).catch(() => []),
                api.getOrgWhatsAppMessages({ limit: 50, ...historyParams }).catch(() => null),
            ]);
            if (st) setStats(st);
            setEventStats(events || []);
            if (history) setLogs(history);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, filterQueueId, filterSessionId, filterStatus, filterEventType, debouncedSearchQuery]);

    useEffect(() => { 
        loadFilteredData();
    }, [loadFilteredData]);

    const allEventsToDisplay = useMemo(() => {
        const displayStats = ACTIVE_EVENTS.map(eventKey => {
            const found = eventStats.find(s => s.event_type === eventKey);
            return found || {
                event_type: eventKey,
                total: 0,
                delivered: 0,
                read: 0,
                failed: 0,
                success_rate: 0
            };
        });

        eventStats.forEach(stat => {
            if (!ACTIVE_EVENTS.includes(stat.event_type)) {
                displayStats.push(stat);
            }
        });
        
        return displayStats;
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
        { id: "history", label: "Message Log" },
        { id: "settings", label: "Settings" },
    ] as const;

    if (loading && !config && !stats) {
        return <div className="text-center p-12 text-slate-500">Loading WhatsApp analytics...</div>;
    }

    return (
        <div className="space-y-6 w-full pb-12">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <svg className="w-6 h-6 text-[#25d366]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 21l1.65 -3.8a9 9 0 1 1 3.4 2.9l-5.05 .9" />
                        <path d="M9 10a.5 .5 0 0 0 1 0v-1a.5 .5 0 0 0 -1 0v1a5 5 0 0 0 5 5h1a.5 .5 0 0 0 0 -1h-1a.5 .5 0 0 0 0 1" />
                    </svg>
                    WhatsApp Analytics & Settings
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Monitor message delivery and configure notifications for your organization.</p>
            </div>

            <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
                            activeTab === tab.id 
                            ? "border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400" 
                            : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-300"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="pt-2">
                {activeTab === "overview" && (
                    <div className="space-y-8">
                        {/* Global Filters */}
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Start Date</label>
                                <input 
                                    type="date" 
                                    value={startDate} 
                                    onChange={e => setStartDate(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
                                />
                            </div>
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">End Date</label>
                                <input 
                                    type="date" 
                                    value={endDate} 
                                    onChange={e => setEndDate(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
                                />
                            </div>
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Queue</label>
                                <select 
                                    value={filterQueueId} 
                                    onChange={e => setFilterQueueId(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
                                >
                                    <option value="">All Queues</option>
                                    {queues.map(q => <option key={q.id} value={q.id}>{q.name}</option>)}
                                </select>
                            </div>
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Session</label>
                                <select 
                                    value={filterSessionId} 
                                    onChange={e => setFilterSessionId(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
                                >
                                    <option value="">All Sessions</option>
                                    {sessions.map(s => <option key={s.id} value={s.id}>{new Date(s.session_date).toLocaleDateString()}</option>)}
                                </select>
                            </div>
                            <button 
                                onClick={() => { setStartDate(""); setEndDate(""); setFilterQueueId(""); setFilterSessionId(""); }}
                                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap border border-transparent"
                            >
                                Clear Filters
                            </button>
                        </div>

                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <StatCard label="Total Sent" value={stats?.total ?? 0} color="#6366f1" />
                            <StatCard label="Delivered" value={stats?.delivered ?? 0} color="#34d399" />
                            <StatCard label="Read" value={stats?.read ?? 0} color="#818cf8" />
                            <StatCard label="Failed" value={stats?.failed ?? 0} color="#f87171" />
                            <StatCard label="Success Rate" value={`${stats?.success_rate ?? 0}%`} color="#f59e0b" />
                        </div>

                        {/* Events Table */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                                <h3 className="font-semibold text-slate-800 dark:text-slate-200">Performance By Event Type</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4 font-medium">Event Type</th>
                                            <th className="px-6 py-4 font-medium">Total Sent</th>
                                            <th className="px-6 py-4 font-medium">Delivered</th>
                                            <th className="px-6 py-4 font-medium">Read</th>
                                            <th className="px-6 py-4 font-medium">Failed</th>
                                            <th className="px-6 py-4 font-medium">Success Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-slate-700 dark:text-slate-300">
                                        {allEventsToDisplay.length === 0 ? (
                                            <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No data available for these filters.</td></tr>
                                        ) : allEventsToDisplay.map((s, i) => (
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                                                <td className="px-6 py-3.5 font-medium flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                                                    {EVENT_LABEL[s.event_type] || s.event_type}
                                                </td>
                                                <td className="px-6 py-3.5 font-medium text-slate-900 dark:text-slate-100">{s.total}</td>
                                                <td className="px-6 py-3.5 text-emerald-600 dark:text-emerald-400 font-medium">{s.delivered}</td>
                                                <td className="px-6 py-3.5 text-indigo-600 dark:text-indigo-400 font-medium">{s.read}</td>
                                                <td className="px-6 py-3.5 text-red-600 dark:text-red-400 font-medium">{s.failed}</td>
                                                <td className="px-6 py-3.5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${s.success_rate}%` }}></div>
                                                        </div>
                                                        <span className="font-bold text-slate-700 dark:text-slate-200">{s.success_rate}%</span>
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
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col sm:flex-row gap-4 items-center">
                            <div className="flex-1 w-full relative">
                                <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                <input type="text" placeholder="Search by name or phone..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow" />
                            </div>
                            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full sm:w-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow">
                                <option value="">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="sent">Sent</option>
                                <option value="delivered">Delivered</option>
                                <option value="read">Read</option>
                                <option value="failed">Failed</option>
                                <option value="skipped">Skipped</option>
                            </select>
                            <select value={filterEventType} onChange={e => setFilterEventType(e.target.value)} className="w-full sm:w-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow">
                                <option value="">All Events</option>
                                {ACTIVE_EVENTS.map(ev => <option key={ev} value={ev}>{EVENT_LABEL[ev] || ev}</option>)}
                            </select>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4 font-medium">Customer / Phone</th>
                                        <th className="px-6 py-4 font-medium">Event</th>
                                        <th className="px-6 py-4 font-medium">Status</th>
                                        <th className="px-6 py-4 font-medium">Timestamp</th>
                                        <th className="px-6 py-4 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-slate-700 dark:text-slate-300">
                                    {logs?.items.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                                No messages sent yet.
                                            </td>
                                        </tr>
                                    ) : logs?.items.map((m: WhatsAppMessage) => (
                                        <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900 dark:text-slate-200">{m.customer_name || "Unknown"}</div>
                                                <div className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-1">{m.customer_phone}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-slate-200 dark:border-slate-700">
                                                    {EVENT_LABEL[m.event_type || ""] || m.event_type || "—"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-bold flex items-center gap-1.5" style={{ color: STATUS_COLOR[m.status] || "#94a3b8" }}>
                                                    {STATUS_ICON[m.status as keyof typeof STATUS_ICON]} 
                                                    <span className="capitalize">{m.status === "skipped" ? "Skipped (No Opt-in)" : m.status}</span>
                                                </span>
                                                {m.error_message && (
                                                    <div className="text-[10px] text-red-600 dark:text-red-400 mt-1.5 max-w-[200px] truncate" title={m.error_message}>
                                                        {m.error_message}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs font-medium">
                                                {fmtTime(m.sent_at)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => setSelectedMessage(m)}
                                                    className="inline-flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                                                    title="View Details"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === "settings" && (
                    <div className="max-w-4xl space-y-6">
                        {/* Global Enable */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Master Switch</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-lg">
                                    Toggle all WhatsApp notifications globally. If paused, NO messages will be sent to any customer.
                                </p>
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer shrink-0">
                                <div className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${config?.is_enabled ? "bg-[#25d366]" : "bg-slate-300 dark:bg-slate-700"}`}>
                                    <input type="checkbox" className="sr-only" checked={config?.is_enabled ?? true} onChange={(e) => handleSettingChange("is_enabled", e.target.checked)} />
                                    <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-sm transition-transform ${config?.is_enabled ? "translate-x-7" : "translate-x-1"}`} />
                                </div>
                            </label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Notification Settings */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
                                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Notification Settings</h2>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Manage how notifications flow to your customers.</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEnableAll(true)}
                                            className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 rounded-lg transition-colors border border-emerald-200 dark:border-emerald-500/30"
                                        >
                                            Enable All
                                        </button>
                                        <button
                                            onClick={() => handleEnableAll(false)}
                                            className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-350 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                                        >
                                            Disable All
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="p-6 space-y-5 flex-1 bg-slate-50/10 dark:bg-slate-950/20">
                                    {/* Toggle Items */}
                                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {/* Queue Joined */}
                                        <div className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                                            <div className="flex gap-3">
                                                <div className="mt-1 text-slate-400 dark:text-slate-500">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Joined Queue</div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Alerts when customer is added. Includes opt-in live update prompt.</div>
                                                </div>
                                            </div>
                                            <div className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${config?.notify_queue_joined ? "bg-[#25d366]" : "bg-slate-300 dark:bg-slate-700"}`} onClick={() => handleSettingChange("notify_queue_joined", !(config?.notify_queue_joined ?? true))}>
                                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${config?.notify_queue_joined ? "translate-x-4" : "translate-x-1"}`} />
                                            </div>
                                        </div>

                                        {/* Position 5 Reminder */}
                                        <div className="py-4 flex items-start justify-between gap-4">
                                            <div className="flex gap-3">
                                                <div className="mt-1 text-slate-400 dark:text-slate-500">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Position 5 Reminder</div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Alerts customer when exactly 5 people are ahead in the queue.</div>
                                                </div>
                                            </div>
                                            <div className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${config?.notify_position_5 ? "bg-[#25d366]" : "bg-slate-300 dark:bg-slate-700"}`} onClick={() => handleSettingChange("notify_position_5", !(config?.notify_position_5 ?? false))}>
                                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${config?.notify_position_5 ? "translate-x-4" : "translate-x-1"}`} />
                                            </div>
                                        </div>

                                        {/* Position 3 Reminder */}
                                        <div className="py-4 flex items-start justify-between gap-4">
                                            <div className="flex gap-3">
                                                <div className="mt-1 text-slate-400 dark:text-slate-500">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Position 3 Reminder (Turn is Near)</div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Alerts customer when exactly 3 people are ahead in the queue.</div>
                                                </div>
                                            </div>
                                            <div className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${config?.notify_position_3 ? "bg-[#25d366]" : "bg-slate-300 dark:bg-slate-700"}`} onClick={() => handleSettingChange("notify_position_3", !(config?.notify_position_3 ?? false))}>
                                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${config?.notify_position_3 ? "translate-x-4" : "translate-x-1"}`} />
                                            </div>
                                        </div>

                                        {/* Customer Called */}
                                        <div className="py-4 flex items-start justify-between gap-4">
                                            <div className="flex gap-3">
                                                <div className="mt-1 text-slate-400 dark:text-slate-500">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Customer Called</div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Alerts customer to proceed to the counter.</div>
                                                </div>
                                            </div>
                                            <div className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${config?.notify_called ? "bg-[#25d366]" : "bg-slate-300 dark:bg-slate-700"}`} onClick={() => handleSettingChange("notify_called", !(config?.notify_called ?? true))}>
                                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${config?.notify_called ? "translate-x-4" : "translate-x-1"}`} />
                                            </div>
                                        </div>

                                        {/* Service Completed */}
                                        <div className="py-4 flex items-start justify-between gap-4">
                                            <div className="flex gap-3">
                                                <div className="mt-1 text-slate-400 dark:text-slate-500">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Service Completed</div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Sends a final thank-you message after completed service.</div>
                                                </div>
                                            </div>
                                            <div className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${config?.notify_completed ? "bg-[#25d366]" : "bg-slate-300 dark:bg-slate-700"}`} onClick={() => handleSettingChange("notify_completed", !(config?.notify_completed ?? false))}>
                                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${config?.notify_completed ? "translate-x-4" : "translate-x-1"}`} />
                                            </div>
                                        </div>

                                        {/* Token Skipped */}
                                        <div className="py-4 flex items-start justify-between gap-4">
                                            <div className="flex gap-3">
                                                <div className="mt-1 text-slate-400 dark:text-slate-500">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Token Skipped</div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Alerts customer when their token is skipped due to unavailability.</div>
                                                </div>
                                            </div>
                                            <div className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${config?.notify_skipped ? "bg-[#25d366]" : "bg-slate-300 dark:bg-slate-700"}`} onClick={() => handleSettingChange("notify_skipped", !(config?.notify_skipped ?? true))}>
                                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${config?.notify_skipped ? "translate-x-4" : "translate-x-1"}`} />
                                            </div>
                                        </div>

                                        {/* Token Recalled */}
                                        <div className="py-4 flex items-start justify-between gap-4">
                                            <div className="flex gap-3">
                                                <div className="mt-1 text-slate-400 dark:text-slate-500">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 6H16" /></svg>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Token Recalled</div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Alerts customer when staff re-calls their previously-skipped token.</div>
                                                </div>
                                            </div>
                                            <div className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${config?.notify_recalled ? "bg-[#25d366]" : "bg-slate-300 dark:bg-slate-700"}`} onClick={() => handleSettingChange("notify_recalled", !(config?.notify_recalled ?? true))}>
                                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${config?.notify_recalled ? "translate-x-4" : "translate-x-1"}`} />
                                            </div>
                                        </div>

                                        {/* Token Removed */}
                                        <div className="py-4 flex items-start justify-between gap-4">
                                            <div className="flex gap-3">
                                                <div className="mt-1 text-slate-400 dark:text-slate-500">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">Token Removed</div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Alerts customer when removed from queue by staff or self-cancellation.</div>
                                                </div>
                                            </div>
                                            <div className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${config?.notify_removed ? "bg-[#25d366]" : "bg-slate-300 dark:bg-slate-700"}`} onClick={() => handleSettingChange("notify_removed", !(config?.notify_removed ?? true))}>
                                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${config?.notify_removed ? "translate-x-4" : "translate-x-1"}`} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Test Notification */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
                                <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Send Test Notification</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Verify your setup by sending a test message.</p>
                                </div>
                                <div className="p-6 flex-1 flex flex-col justify-center bg-slate-50/30 dark:bg-slate-900/50">
                                    <div className="space-y-4 max-w-sm mx-auto w-full">
                                        <div className="text-center mb-6">
                                            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Enter your WhatsApp number with country code to receive a test message immediately.</p>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="+1234567890"
                                            value={testPhone}
                                            onChange={e => setTestPhone(e.target.value)}
                                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm text-center text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono tracking-wider"
                                        />
                                        <button
                                            onClick={sendTest}
                                            disabled={sendingTest || !testPhone.trim()}
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-3 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow active:scale-[0.98]"
                                        >
                                            {sendingTest ? "Sending..." : "Send Test Message"}
                                        </button>
                                        {testMsg && (
                                            <div className={`text-sm mt-4 font-medium text-center p-3 rounded-lg ${testMsg.includes("✓") ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20" : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 border border-red-100 dark:border-red-500/20"}`}>
                                                {testMsg}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {selectedMessage && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                    <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    Message Log Details
                                </h3>
                                <button 
                                    onClick={() => setSelectedMessage(null)} 
                                    className="p-2 -mr-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                            
                            <div className="p-6 overflow-y-auto space-y-6">
                                <div className="grid grid-cols-2 gap-x-6 gap-y-4 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Customer</div>
                                        <div className="mt-1 font-medium text-slate-900 dark:text-white">{selectedMessage.customer_name || "Unknown"}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phone</div>
                                        <div className="mt-1 font-mono text-sm text-slate-700 dark:text-slate-300">{selectedMessage.customer_phone}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Event</div>
                                        <div className="mt-1">
                                            <span className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-slate-200 dark:border-slate-700 shadow-sm">
                                                {EVENT_LABEL[selectedMessage.event_type || ""] || selectedMessage.event_type || "—"}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</div>
                                        <div className="flex items-center gap-1.5 font-bold" style={{ color: STATUS_COLOR[selectedMessage.status] }}>
                                            {STATUS_ICON[selectedMessage.status as keyof typeof STATUS_ICON]} 
                                            <span className="capitalize">{selectedMessage.status === "skipped" ? "Skipped (No Opt-in)" : selectedMessage.status}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Timestamp</div>
                                        <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">{fmtTime(selectedMessage.sent_at || selectedMessage.created_at)}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Meta Message ID</div>
                                        <div className="mt-1 text-xs font-mono text-slate-500 dark:text-slate-400 truncate" title={selectedMessage.meta_message_id || ""}>
                                            {selectedMessage.meta_message_id || "—"}
                                        </div>
                                    </div>
                                </div>
                                
                                {(selectedMessage.error_message || selectedMessage.error_code) && (
                                    <div>
                                        <div className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                            Error Details
                                        </div>
                                        <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-700 dark:text-red-400 rounded-xl text-sm whitespace-pre-wrap">
                                            {selectedMessage.error_code && <div className="font-mono text-xs mb-1 font-bold">Code: {selectedMessage.error_code}</div>}
                                            {selectedMessage.error_message}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Message Payload</div>
                                    <div className="p-4 bg-slate-900 rounded-xl shadow-inner overflow-hidden border border-slate-800">
                                        <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap overflow-x-auto">
                                            {selectedMessage.rendered_body || JSON.stringify(selectedMessage.template_variables, null, 2) || "No payload logged"}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-end">
                                <button 
                                    onClick={() => setSelectedMessage(null)}
                                    className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-semibold transition-colors shadow-sm"
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
