"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { SystemMonitoringResponse } from "@/types/api";

export default function SystemMonitoringPage() {
    const [data, setData] = useState<SystemMonitoringResponse | null>(null);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await api.getSystemMonitoring();
            setData(res);
        } catch (error) {
            console.error("Failed to load system monitoring data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // Optional: poll every 30 seconds
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, []);

    const formatUptime = (seconds: number) => {
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor((seconds % (3600 * 24)) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        
        const parts = [];
        if (d > 0) parts.push(`${d}d`);
        if (h > 0) parts.push(`${h}h`);
        if (m > 0) parts.push(`${m}m`);
        if (s > 0 || parts.length === 0) parts.push(`${s}s`);
        
        return parts.join(" ");
    };

    const StatusIndicator = ({ status, label }: { status: string, label: string }) => {
        const isOk = status === "ok" || status === "connected";
        return (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between shadow-sm">
                <div>
                    <p className="text-sm font-medium text-slate-400 mb-1">{label}</p>
                    <p className="text-lg font-bold text-slate-200 capitalize">{status || "Unknown"}</p>
                </div>
                <div className={`w-3 h-3 rounded-full ${isOk ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"}`} />
            </div>
        );
    };

    if (loading && !data) {
        return (
            <div className="flex justify-center items-center h-64 text-slate-400">
                <svg className="animate-spin w-6 h-6 text-indigo-500 mr-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading system status...
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <svg className="w-6 h-6 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                        </svg>
                        System Monitoring
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">Live status of critical infrastructure components and services.</p>
                </div>
                <button onClick={loadData} disabled={loading} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-lg transition-colors border border-slate-700 flex items-center gap-2">
                    <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    Refresh
                </button>
            </div>

            {/* Health Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatusIndicator status={data?.api_health || "error"} label="API Health" />
                <StatusIndicator status={data?.database_health || "error"} label="Database Health" />
                <StatusIndicator status={data?.redis_health || "error"} label="Redis Health" />
                <StatusIndicator status={data?.whatsapp_health || "error"} label="WhatsApp Service" />
            </div>

            {/* Uptime */}
            <div className="bg-gradient-to-r from-indigo-900/50 to-slate-900 border border-indigo-500/20 rounded-2xl p-6 shadow-xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center">
                        <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-indigo-300/80 mb-0.5">System Uptime</p>
                        <p className="text-2xl font-bold text-white tracking-tight">
                            {data ? formatUptime(data.uptime_seconds) : "..."}
                        </p>
                    </div>
                </div>
            </div>

            {/* Error Logs */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                    <h2 className="text-base font-semibold text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Recent Error Logs
                    </h2>
                    <span className="text-xs font-medium text-slate-500 bg-slate-800 px-2 py-1 rounded-md border border-slate-700">Simulated Data</span>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-800/50 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Timestamp</th>
                                <th className="px-6 py-4">Severity</th>
                                <th className="px-6 py-4">Component</th>
                                <th className="px-6 py-4">Message</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                            {data?.recent_errors.map(err => (
                                <tr key={err.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4 text-slate-400 whitespace-nowrap tabular-nums text-xs">
                                        {new Date(err.timestamp).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                                            err.severity === 'error' 
                                                ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                        }`}>
                                            {err.severity.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-300 font-medium">
                                        {err.component}
                                    </td>
                                    <td className="px-6 py-4 text-slate-400 font-mono text-xs w-full">
                                        {err.message}
                                    </td>
                                </tr>
                            ))}
                            {(!data?.recent_errors || data.recent_errors.length === 0) && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                                        No recent errors found. System is stable.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Developer Alert */}
            <div className="mt-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <div>
                    <h3 className="text-sm font-semibold text-amber-400">Developer Note</h3>
                    <p className="text-sm text-amber-400/80 mt-1">
                        The content on this page is currently using dummy data for UI testing and demonstration purposes. It is not yet connected to a live database.
                    </p>
                </div>
            </div>
        </div>
    );
}
