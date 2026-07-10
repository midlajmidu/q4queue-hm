"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import { Phone, Clock, CalendarDays, Filter } from "lucide-react";

function fmtTime(iso?: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString();
}

function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
}

export function CallLogsPortal() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [filterQueueId, setFilterQueueId] = useState("");
    const [filterSessionId, setFilterSessionId] = useState("");
    
    const [queues, setQueues] = useState<any[]>([]);
    const [sessions, setSessions] = useState<any[]>([]);

    const loadInitialData = useCallback(async () => {
        try {
            const [qs, ss] = await Promise.all([
                api.listQueues().catch(() => []),
                api.listSessions(100).catch(() => ({ items: [] })),
            ]);
            setQueues(qs || []);
            setSessions(ss?.items || []);
        } catch (e) {
            console.error("Failed to load queues/sessions", e);
        }
    }, []);

    const loadCallLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (filterQueueId) params.queue_id = filterQueueId;
            if (filterSessionId) params.session_id = filterSessionId;
            
            const data = await api.getCallLogs(params);
            setLogs(data || []);
        } catch (error) {
            console.error("Failed to load call logs:", error);
        } finally {
            setLoading(false);
        }
    }, [filterQueueId, filterSessionId]);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    useEffect(() => {
        loadCallLogs();
    }, [loadCallLogs]);

    const totalDurationSeconds = useMemo(() => {
        return logs.reduce((acc, log) => acc + (log.duration_seconds || 0), 0);
    }, [logs]);

    return (
        <div className="space-y-6 w-full pb-12 animate-in fade-in duration-300">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Phone className="w-4 h-4" />
                    </div>
                    Call Logs & Analytics
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Monitor WebRTC calls made to customers from the queue dashboard.
                </p>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                    <div className="text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                        {logs.length}
                    </div>
                    <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Total Calls Made</div>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                    <div className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                        {formatDuration(totalDurationSeconds)}
                    </div>
                    <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">Total Call Duration</div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 items-end">
                <div className="w-full md:w-48">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Filter className="w-3.5 h-3.5" /> Queue
                    </label>
                    <select
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                        value={filterQueueId}
                        onChange={(e) => setFilterQueueId(e.target.value)}
                    >
                        <option value="">All Queues</option>
                        {queues.map((q) => (
                            <option key={q.id} value={q.id}>{q.name}</option>
                        ))}
                    </select>
                </div>
                <div className="w-full md:w-48">
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5" /> Session
                    </label>
                    <select
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                        value={filterSessionId}
                        onChange={(e) => setFilterSessionId(e.target.value)}
                    >
                        <option value="">All Sessions</option>
                        {sessions.map((s) => (
                            <option key={s.id} value={s.id}>{new Date(s.date).toLocaleDateString()}</option>
                        ))}
                    </select>
                </div>
                <div className="ml-auto">
                    <button 
                        onClick={loadCallLogs}
                        disabled={loading}
                        className="px-4 py-2.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                                Refreshing...
                            </>
                        ) : (
                            <>
                                <Clock className="w-4 h-4" />
                                Refresh Logs
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                        <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Timestamp</th>
                                <th className="px-6 py-4 font-semibold">Customer</th>
                                <th className="px-6 py-4 font-semibold">Phone</th>
                                <th className="px-6 py-4 font-semibold">Duration</th>
                                <th className="px-6 py-4 font-semibold">Queue / Session</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        {loading ? "Loading calls..." : "No calls found matching your filters."}
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => {
                                    const queue = queues.find(q => q.id === log.queue_id);
                                    const session = sessions.find(s => s.id === log.session_id);
                                    
                                    return (
                                        <tr key={log.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {fmtTime(log.created_at)}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                                {log.customer_name || "—"}
                                            </td>
                                            <td className="px-6 py-4 font-mono">
                                                {log.customer_phone || "—"}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {formatDuration(log.duration_seconds)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs">
                                                <div className="font-medium text-slate-700 dark:text-slate-300">{queue?.name || "—"}</div>
                                                <div className="text-slate-400 mt-0.5">{session ? new Date(session.date).toLocaleDateString() : "—"}</div>
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
    );
}
