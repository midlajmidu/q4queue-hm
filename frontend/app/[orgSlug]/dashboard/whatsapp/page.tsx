"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { 
    WhatsAppOrgConfig, 
    WhatsAppOrgStats, 
    PaginatedWhatsAppMessages, 
    WhatsAppMessage,
    WhatsAppEventStat,
    WhatsAppQueueStat,
    WhatsAppSessionStat
} from "@/types/api";

const STATUS_ICON = {
    pending: "⏳",
    sent: "✓",
    delivered: "✓✓",
    read: "👁",
    failed: "✗",
};

const STATUS_COLOR: Record<string, string> = {
    pending: "#94a3b8",
    sent: "#38bdf8",
    delivered: "#34d399",
    read: "#818cf8",
    failed: "#f87171",
};

const EVENT_LABEL: Record<string, string> = {
    "queue_joined_v2": "Queue Joined (Template)",
    "queue_position_v2": "Position Update",
    "queue_served_v2": "Customer Called",
    "queue_completed_v2": "Service Completed",
    "queue.joined": "Joined (Legacy)",
    "queue.position_5": "Position 5 (Legacy)",
    "queue.position_3": "Position 3 (Legacy)",
    "queue.called": "Called (Legacy)",
    "queue.completed": "Completed (Legacy)",
    test: "Test",
};

function fmtTime(iso?: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString();
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="text-3xl font-bold" style={{ color }}>{value}</div>
            <div className="text-sm text-slate-400 mt-1">{label}</div>
        </div>
    );
}

export default function OrgWhatsAppDashboard() {
    const [activeTab, setActiveTab] = useState<"overview" | "events" | "queues" | "sessions" | "history" | "settings">("overview");

    const [config, setConfig] = useState<WhatsAppOrgConfig | null>(null);
    const [stats, setStats] = useState<WhatsAppOrgStats | null>(null);
    const [eventStats, setEventStats] = useState<WhatsAppEventStat[]>([]);
    const [queueStats, setQueueStats] = useState<WhatsAppQueueStat[]>([]);
    const [sessionStats, setSessionStats] = useState<WhatsAppSessionStat[]>([]);
    const [logs, setLogs] = useState<PaginatedWhatsAppMessages | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Settings state
    const [testPhone, setTestPhone] = useState("");
    const [sendingTest, setSendingTest] = useState(false);
    const [testMsg, setTestMsg] = useState("");

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [cfg, st, events, queues, sessions, history] = await Promise.all([
                api.getOrgWhatsAppConfig().catch(() => null),
                api.getOrgWhatsAppStats().catch(() => null),
                api.getOrgWhatsAppEventStats().catch(() => []),
                api.getOrgWhatsAppQueueStats().catch(() => []),
                api.getOrgWhatsAppSessionStats().catch(() => []),
                api.getOrgWhatsAppMessages({ limit: 50 }).catch(() => null),
            ]);
            if (cfg) setConfig(cfg);
            if (st) setStats(st);
            setEventStats(events || []);
            setQueueStats(queues || []);
            setSessionStats(sessions || []);
            if (history) setLogs(history);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleSettingChange = async (key: keyof WhatsAppOrgConfig, value: boolean) => {
        if (!config) return;
        
        // Optimistic UI update
        const previousConfig = { ...config };
        setConfig({ ...config, [key]: value });
        
        try {
            await api.setOrgWhatsAppEnabled({ [key]: value });
        } catch {
            alert("Failed to update setting");
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
            setTimeout(loadData, 2000);
        } catch {
            setTestMsg("✗ Failed to send test message");
        } finally {
            setSendingTest(false);
        }
    };

    const tabs = [
        { id: "overview", label: "Overview" },
        { id: "events", label: "By Event" },
        { id: "queues", label: "By Queue" },
        { id: "sessions", label: "By Session" },
        { id: "history", label: "Message Log" },
        { id: "settings", label: "Settings" },
    ] as const;

    if (loading && !config) {
        return <div className="text-center p-12 text-slate-500">Loading WhatsApp analytics...</div>;
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <svg className="w-6 h-6 text-[#25d366]" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12.012 2C6.49 2 2 6.49 2 12.013c0 1.764.462 3.428 1.258 4.887L2 22l5.244-1.219a9.96 9.96 0 004.768 1.218h.004c5.52 0 10.01-4.488 10.01-10.009S17.534 2 12.012 2zm4.57 14.082c-.25-.125-1.482-.733-1.713-.816-.23-.084-.397-.126-.566.125-.168.252-.647.817-.792.984-.146.168-.293.188-.543.063a6.83 6.83 0 01-2.008-1.24 7.55 7.55 0 01-1.393-1.737c-.146-.252-.016-.388.11-.513.113-.112.25-.292.376-.439.125-.147.167-.251.25-.418.084-.168.042-.315-.021-.44-.063-.125-.565-1.36-.774-1.864-.203-.49-.408-.423-.566-.431-.146-.008-.313-.01-.48-.01a.92.92 0 00-.668.314c-.23.25-.878.858-.878 2.093 0 1.234.9 2.427 1.025 2.594.126.167 1.766 2.695 4.28 3.778 1.543.663 2.164.717 2.946.602.868-.126 2.673-1.09 3.05-2.146.376-1.055.376-1.956.262-2.145-.115-.188-.43-.303-.68-.428z" />
                    </svg>
                    WhatsApp Analytics & Settings
                </h1>
                <p className="text-sm text-slate-400 mt-1">Monitor message delivery and configure notifications for your organization.</p>
            </div>

            <div className="flex border-b border-slate-800 space-x-6">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
                            activeTab === tab.id 
                            ? "border-indigo-500 text-indigo-400" 
                            : "border-transparent text-slate-400 hover:text-slate-300"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="pt-4">
                {activeTab === "overview" && (
                    <div className="space-y-6">
                        <div className="bg-indigo-900/40 border border-indigo-500/30 rounded-xl p-5 flex items-start gap-4">
                            <div className="bg-indigo-500/20 p-2 rounded-lg shrink-0">
                                <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </div>
                            <div>
                                <h3 className="text-indigo-200 font-bold text-sm">Hybrid Notification Model Active</h3>
                                <p className="text-indigo-300/80 text-xs mt-1 leading-relaxed">
                                    Your organization is utilizing our ultra-efficient Hybrid Notification Model. You only pay Meta for the initial Welcome template. All subsequent updates (Position, Turn, etc.) bypass Meta templates and are delivered 100% free of charge for customers who opt in!
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <StatCard label="Total Sent" value={stats?.total ?? 0} color="#6366f1" />
                            <StatCard label="Delivered" value={stats?.delivered ?? 0} color="#34d399" />
                            <StatCard label="Read" value={stats?.read ?? 0} color="#818cf8" />
                            <StatCard label="Failed" value={stats?.failed ?? 0} color="#f87171" />
                            <StatCard label="Success Rate" value={`${stats?.success_rate ?? 0}%`} color="#f59e0b" />
                        </div>
                    </div>
                )}

                {activeTab === "events" && (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Event Type</th>
                                    <th className="px-6 py-3 font-medium">Total</th>
                                    <th className="px-6 py-3 font-medium">Delivered</th>
                                    <th className="px-6 py-3 font-medium">Read</th>
                                    <th className="px-6 py-3 font-medium">Failed</th>
                                    <th className="px-6 py-3 font-medium">Success Rate</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50 text-slate-300">
                                {eventStats.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No data available</td></tr>
                                ) : eventStats.map((s, i) => (
                                    <tr key={i} className="hover:bg-slate-800/20">
                                        <td className="px-6 py-3 font-medium">{EVENT_LABEL[s.event_type] || s.event_type}</td>
                                        <td className="px-6 py-3">{s.total}</td>
                                        <td className="px-6 py-3 text-emerald-400">{s.delivered}</td>
                                        <td className="px-6 py-3 text-indigo-400">{s.read}</td>
                                        <td className="px-6 py-3 text-red-400">{s.failed}</td>
                                        <td className="px-6 py-3 font-bold">{s.success_rate}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === "queues" && (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Queue</th>
                                    <th className="px-6 py-3 font-medium">Total</th>
                                    <th className="px-6 py-3 font-medium">Delivered</th>
                                    <th className="px-6 py-3 font-medium">Read</th>
                                    <th className="px-6 py-3 font-medium">Failed</th>
                                    <th className="px-6 py-3 font-medium">Success Rate</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50 text-slate-300">
                                {queueStats.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No data available</td></tr>
                                ) : queueStats.map((s, i) => (
                                    <tr key={i} className="hover:bg-slate-800/20">
                                        <td className="px-6 py-3 font-medium">{s.queue_name}</td>
                                        <td className="px-6 py-3">{s.total}</td>
                                        <td className="px-6 py-3 text-emerald-400">{s.delivered}</td>
                                        <td className="px-6 py-3 text-indigo-400">{s.read}</td>
                                        <td className="px-6 py-3 text-red-400">{s.failed}</td>
                                        <td className="px-6 py-3 font-bold">{s.success_rate}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === "sessions" && (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Session Date</th>
                                    <th className="px-6 py-3 font-medium">Total</th>
                                    <th className="px-6 py-3 font-medium">Delivered</th>
                                    <th className="px-6 py-3 font-medium">Read</th>
                                    <th className="px-6 py-3 font-medium">Failed</th>
                                    <th className="px-6 py-3 font-medium">Success Rate</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50 text-slate-300">
                                {sessionStats.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No data available</td></tr>
                                ) : sessionStats.map((s, i) => (
                                    <tr key={i} className="hover:bg-slate-800/20">
                                        <td className="px-6 py-3 font-medium">{s.session_date}</td>
                                        <td className="px-6 py-3">{s.total}</td>
                                        <td className="px-6 py-3 text-emerald-400">{s.delivered}</td>
                                        <td className="px-6 py-3 text-indigo-400">{s.read}</td>
                                        <td className="px-6 py-3 text-red-400">{s.failed}</td>
                                        <td className="px-6 py-3 font-bold">{s.success_rate}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === "history" && (
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Customer / Phone</th>
                                        <th className="px-6 py-3 font-medium">Event</th>
                                        <th className="px-6 py-3 font-medium">Status</th>
                                        <th className="px-6 py-3 font-medium">Timestamp</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50 text-slate-300">
                                    {logs?.items.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                                No messages sent yet.
                                            </td>
                                        </tr>
                                    ) : logs?.items.map((m: WhatsAppMessage) => (
                                        <tr key={m.id} className="hover:bg-slate-800/20 transition-colors">
                                            <td className="px-6 py-3">
                                                <div className="font-medium text-slate-200">{m.customer_name || "Unknown"}</div>
                                                <div className="font-mono text-xs text-slate-500 mt-0.5">{m.customer_phone}</div>
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className="bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md text-[11px] font-medium">
                                                    {EVENT_LABEL[m.event_type || ""] || m.event_type || "—"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className="font-semibold flex items-center gap-1.5" style={{ color: STATUS_COLOR[m.status] || "#94a3b8" }}>
                                                    {STATUS_ICON[m.status as keyof typeof STATUS_ICON]} 
                                                    <span className="capitalize">{m.status}</span>
                                                </span>
                                                {m.error_message && (
                                                    <div className="text-[10px] text-red-400 mt-1 max-w-[200px] truncate" title={m.error_message}>
                                                        {m.error_message}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-3 text-slate-400 text-xs">
                                                {fmtTime(m.sent_at)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === "settings" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Global Enable */}
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 col-span-1 md:col-span-2">
                            <h2 className="text-lg font-bold text-white mb-4">Master Switch</h2>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config?.is_enabled ? "bg-[#25d366]" : "bg-slate-700"}`}>
                                    <input type="checkbox" className="sr-only" checked={config?.is_enabled ?? true} onChange={(e) => handleSettingChange("is_enabled", e.target.checked)} />
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config?.is_enabled ? "translate-x-6" : "translate-x-1"}`} />
                                </div>
                                <span className="text-sm font-medium text-slate-200">
                                    {config?.is_enabled ? "All Notifications Enabled" : "All Notifications Paused"}
                                </span>
                            </label>
                            <p className="text-xs text-slate-500 mt-2">
                                If paused, NO WhatsApp messages will be sent to any customer, regardless of the individual toggles below.
                            </p>
                        </div>

                        {/* Hybrid Configurations */}
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                            <h2 className="text-lg font-bold text-white mb-2">Notification Pipeline</h2>
                            <p className="text-sm text-slate-400 mb-6">Manage how notifications flow to your customers through the hybrid pipeline.</p>
                            
                            {/* Section 1: Paid Template */}
                            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-5 mb-6">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-bold text-emerald-400 text-sm uppercase tracking-wide">Step 1: Primary Gateway</h3>
                                    <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded border border-emerald-500/20">Paid Template</span>
                                </div>
                                <p className="text-xs text-slate-400 mb-4">This initial welcome message uses an official Meta Utility template to establish the 24-hour service window.</p>
                                
                                <label className="flex items-center justify-between cursor-pointer">
                                    <div>
                                        <div className="text-sm font-medium text-slate-200">Queue Joined</div>
                                        <div className="text-xs text-slate-500 mt-0.5">Sent immediately when a customer is added to a queue. Includes the quick-reply opt-in button.</div>
                                    </div>
                                    <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${config?.notify_queue_joined ? "bg-[#25d366]" : "bg-slate-700"}`}>
                                        <input type="checkbox" className="sr-only" checked={config?.notify_queue_joined ?? true} onChange={(e) => handleSettingChange("notify_queue_joined", e.target.checked)} />
                                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${config?.notify_queue_joined ? "translate-x-4" : "translate-x-1"}`} />
                                    </div>
                                </label>
                            </div>

                            {/* Section 2: Free Hybrid */}
                            <div className="bg-indigo-900/20 border border-indigo-500/20 rounded-lg p-5">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-bold text-indigo-400 text-sm uppercase tracking-wide">Step 2: Free Hybrid Follow-ups</h3>
                                    <span className="bg-indigo-500/10 text-indigo-400 text-[10px] px-2 py-0.5 rounded border border-indigo-500/20">100% Free</span>
                                </div>
                                <p className="text-xs text-slate-400 mb-5">These updates are delivered as raw text completely free of charge. <strong>Note:</strong> They are only delivered if the user actively opted in via the Quick Reply button on the welcome message.</p>

                                <div className="space-y-4">
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <div>
                                            <div className="text-sm font-medium text-slate-200">Position 5 Reminder</div>
                                            <div className="text-xs text-slate-500 mt-0.5">Alerts customer when there are exactly 5 people ahead.</div>
                                        </div>
                                        <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${config?.notify_position_5 ? "bg-indigo-500" : "bg-slate-700"}`}>
                                            <input type="checkbox" className="sr-only" checked={config?.notify_position_5 ?? false} onChange={(e) => handleSettingChange("notify_position_5", e.target.checked)} />
                                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${config?.notify_position_5 ? "translate-x-4" : "translate-x-1"}`} />
                                        </div>
                                    </label>

                                    <label className="flex items-center justify-between cursor-pointer">
                                        <div>
                                            <div className="text-sm font-medium text-slate-200">Position 3 Reminder</div>
                                            <div className="text-xs text-slate-500 mt-0.5">Alerts customer when there are exactly 3 people ahead.</div>
                                        </div>
                                        <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${config?.notify_position_3 ? "bg-indigo-500" : "bg-slate-700"}`}>
                                            <input type="checkbox" className="sr-only" checked={config?.notify_position_3 ?? false} onChange={(e) => handleSettingChange("notify_position_3", e.target.checked)} />
                                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${config?.notify_position_3 ? "translate-x-4" : "translate-x-1"}`} />
                                        </div>
                                    </label>

                                    <label className="flex items-center justify-between cursor-pointer">
                                        <div>
                                            <div className="text-sm font-medium text-slate-200">Customer Called</div>
                                            <div className="text-xs text-slate-500 mt-0.5">Sent when it is their turn to proceed to the counter.</div>
                                        </div>
                                        <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${config?.notify_called ? "bg-indigo-500" : "bg-slate-700"}`}>
                                            <input type="checkbox" className="sr-only" checked={config?.notify_called ?? true} onChange={(e) => handleSettingChange("notify_called", e.target.checked)} />
                                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${config?.notify_called ? "translate-x-4" : "translate-x-1"}`} />
                                        </div>
                                    </label>

                                    <label className="flex items-center justify-between cursor-pointer">
                                        <div>
                                            <div className="text-sm font-medium text-slate-200">Service Completed</div>
                                            <div className="text-xs text-slate-500 mt-0.5">Thank you message and review request when service finishes.</div>
                                        </div>
                                        <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${config?.notify_completed ? "bg-indigo-500" : "bg-slate-700"}`}>
                                            <input type="checkbox" className="sr-only" checked={config?.notify_completed ?? false} onChange={(e) => handleSettingChange("notify_completed", e.target.checked)} />
                                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${config?.notify_completed ? "translate-x-4" : "translate-x-1"}`} />
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Test Notification */}
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-white mb-4">Send Test Notification</h2>
                                <p className="text-xs text-slate-400 mb-6">
                                    Verify your setup by sending a direct test message. This uses your active tokens to reach out immediately.
                                </p>
                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        placeholder="+1234567890 (include country code)"
                                        value={testPhone}
                                        onChange={e => setTestPhone(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                                    />
                                    <button
                                        onClick={sendTest}
                                        disabled={sendingTest}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-3 rounded-lg text-sm transition-colors disabled:opacity-50"
                                    >
                                        {sendingTest ? "Sending…" : "Send Test Message"}
                                    </button>
                                </div>
                                {testMsg && <div className={`text-sm mt-4 font-medium ${testMsg.includes("✓") ? "text-emerald-400" : "text-red-400"}`}>{testMsg}</div>}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
