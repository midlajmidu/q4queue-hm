"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Activity, Shield, Zap, Building2, Trash2 } from "lucide-react";
import Link from "next/link";

export default function GlobalActivityFeed() {
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            // Get the latest audit logs
            const data = await api.getOrgAdminAudit();
            setLogs(data.slice(0, 8));
        } catch (err) {
            console.error("Failed to load audit logs", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadLogs();
        const interval = setInterval(loadLogs, 15000); // 15s polling
        return () => clearInterval(interval);
    }, [loadLogs]);

    const getActionStyle = (event_type: string) => {
        if (!event_type) return { avatarBg: "bg-slate-200", avatarText: "text-slate-600", icon: Activity };
        if (event_type.startsWith("auth.")) return { avatarBg: "bg-blue-500", avatarText: "text-white", icon: Shield };
        if (event_type.startsWith("queue.")) return { avatarBg: "bg-emerald-500", avatarText: "text-white", icon: Zap };
        if (event_type.startsWith("org.")) return { avatarBg: "bg-indigo-500", avatarText: "text-white", icon: Building2 };
        if (event_type.includes("delete")) return { avatarBg: "bg-rose-500", avatarText: "text-white", icon: Trash2 };
        return { avatarBg: "bg-slate-400", avatarText: "text-white", icon: Activity };
    };

    const getInitials = (email: string) => {
        if (!email) return "SY";
        const parts = email.split("@")[0].split(/[._-]/);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return email.substring(0, 2).toUpperCase();
    };

    const getActionText = (log: any) => {
        const actionMap: Record<string, string> = {
            "auth.login": "logged in",
            "auth.login_failed": "failed to login",
            "queue.create": "created a queue",
            "queue.toggle": "toggled a queue",
            "org.create": "created an organization",
        };
        let text = actionMap[log.action];
        if (!text && log.action) {
            text = log.action.toLowerCase().replace(/_/g, ' ');
            if (text.includes('created')) text = 'created ' + text.replace(' created', '').replace('org ', '');
            else if (text.includes('updated')) text = 'updated ' + text.replace(' updated', '').replace('org ', '');
            else if (text.includes('deleted')) text = 'deleted ' + text.replace(' deleted', '').replace('org ', '');
        } else if (!text) {
            text = "performed an action";
        }
        
        return (
            <span className="text-sm">
                <span className="font-semibold text-slate-900">{log.user_email || log.ip_address || "System"}</span> {text}
                {log.branch && <span> in <span className="font-medium text-slate-600">{log.branch}</span></span>}
            </span>
        );
    };

    const formatTime = (isoString: string) => {
        if (!isoString) return "Recently";
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return "Recently";
        const today = new Date();
        const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return isToday ? timeStr : `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm h-full flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                        <Activity size={14} className="text-slate-400" strokeWidth={2} />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-800 tracking-tight">Global Activity</h3>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href="/organization-admin/monitoring/audit"
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                        View all →
                    </Link>
                    <button
                        onClick={loadLogs}
                        disabled={isLoading}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-40"
                    >
                        <svg className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>
            </div>
            
            {/* Feed */}
            <div className="overflow-y-auto flex-1 min-h-0 h-[250px]">
                {isLoading && logs.length === 0 ? (
                    <div className="p-5 space-y-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex gap-3 animate-pulse">
                                <div className="w-8 h-8 rounded-full bg-slate-100 shrink-0" />
                                <div className="space-y-2 flex-1 pt-1">
                                    <div className="h-3 bg-slate-100 rounded w-3/4" />
                                    <div className="h-2 bg-slate-50 rounded w-1/4" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 p-8">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-1">
                            <Activity size={18} className="text-slate-300" />
                        </div>
                        <p className="text-sm font-medium text-slate-400">No recent activity.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {logs.map((log) => {
                            const style = getActionStyle(log.action);
                            const identifier = log.user_email || log.ip_address || "System";
                            const initials = getInitials(identifier);
                            
                            return (
                                <div key={log.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                                    {/* Colored avatar with initials */}
                                    <div className={`w-8 h-8 rounded-full ${style.avatarBg} ${style.avatarText} flex items-center justify-center text-[11px] font-bold shrink-0 ring-2 ring-white`}>
                                        {initials}
                                    </div>

                                    <div className="flex flex-col min-w-0 flex-1 pt-0.5">
                                        <p className="text-slate-600 leading-snug text-sm truncate">
                                            {getActionText(log)}
                                        </p>
                                        <span className="font-mono text-[11px] text-slate-400 mt-0.5">
                                            {formatTime(log.timestamp)}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
