"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Activity, Shield, Zap, Building2, Trash2 } from "lucide-react";
import { PremiumCard } from "./../ui/PremiumCard";

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
        if (!event_type) return { bg: "bg-slate-100", text: "text-slate-500", icon: Activity };
        if (event_type.startsWith("auth.")) return { bg: "bg-blue-50", text: "text-blue-500", icon: Shield };
        if (event_type.startsWith("queue.")) return { bg: "bg-emerald-50", text: "text-emerald-500", icon: Zap };
        if (event_type.startsWith("org.")) return { bg: "bg-indigo-50", text: "text-indigo-500", icon: Building2 };
        if (event_type.includes("delete")) return { bg: "bg-rose-50", text: "text-rose-500", icon: Trash2 };
        return { bg: "bg-slate-100", text: "text-slate-500", icon: Activity };
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
        <div className="bg-white rounded-xl h-full flex flex-col flex-1 min-h-0 border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <div className="text-slate-400">
                        <Activity size={16} strokeWidth={2} />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 tracking-tight">Global Activity</h3>
                </div>
                <button onClick={loadLogs} disabled={isLoading} className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-colors disabled:opacity-40">
                    <svg className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1 min-h-0 h-[250px] scrollbar-thin">
                {isLoading && logs.length === 0 ? (
                    <div className="space-y-6">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="flex gap-4 animate-pulse">
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-200 mt-1.5 shrink-0" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-3 bg-slate-200 rounded w-3/4" />
                                    <div className="h-2 bg-slate-100 rounded w-1/4" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                        <svg className="w-8 h-8 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                        <p className="text-sm font-medium">No recent activity.</p>
                    </div>
                ) : (
                    <div className="relative border-l-2 border-slate-100 ml-4 space-y-6 pb-2">
                        {logs.map((log) => {
                            const style = getActionStyle(log.action);
                            const Icon = style.icon;
                            
                            return (
                                <div key={log.id} className="relative pl-8 group">
                                    {/* Categorization Icon Indicator */}
                                    <div className={`absolute -left-[15px] top-0 w-8 h-8 rounded-full ${style.bg} ${style.text} flex items-center justify-center shadow-sm ring-4 ring-white group-hover:scale-110 transition-transform`}>
                                        <Icon size={14} strokeWidth={2.5} />
                                    </div>
                                    
                                    <div className="flex flex-col pt-1">
                                        <p className="text-slate-600 leading-snug">
                                            {getActionText(log)}
                                        </p>
                                        <span className="text-[11px] text-slate-400 mt-1 font-semibold tracking-wide uppercase">
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
