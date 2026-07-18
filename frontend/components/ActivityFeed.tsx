"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { AuditLogDetail } from "@/types/api";

export default function ActivityFeed() {
    const [logs, setLogs] = useState<AuditLogDetail[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

    const loadLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await api.getAuditLogs(20, 0);
            setLogs(data.items);
        } catch (err) {
            console.error("Failed to load audit logs", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    const getActionColor = (event_type: string) => {
        if (event_type.startsWith("auth.")) return "bg-blue-500 shadow-blue-500/20";
        if (event_type.startsWith("queue.")) return "bg-emerald-500 shadow-emerald-500/20";
        if (event_type.startsWith("org.")) return "bg-amber-500 shadow-amber-500/20";
        if (event_type.includes("delete")) return "bg-red-500 shadow-red-500/20";
        return "bg-slate-500 shadow-slate-500/20";
    };

    const getActionText = (log: AuditLogDetail) => {
        const actionMap: Record<string, string> = {
            "auth.login": "logged in",
            "auth.login_failed": "failed to log in",
            "auth.logout": "logged out",
            "queue.create": "created a new queue",
            "queue.update": "updated queue settings",
            "queue.toggle": "toggled queue status",
            "queue.delete": "deleted a queue",
            "org.create": "created a new branch",
            "org.update": "updated branch settings",
            "org.delete": "deleted a branch",
            "user.create": "added a new staff member",
            "user.update": "updated staff details",
            "user.delete": "removed a staff member",
            "token.create": "added a customer to queue",
            "token.serve": "started serving a customer",
            "token.complete": "completed serving a customer",
            "token.cancel": "cancelled a customer's token",
            "message.send": "sent a message",
        };
        
        let text = actionMap[log.event_type];
        if (!text && log.event_type) {
            text = log.event_type.toLowerCase().replace(/[._]/g, ' ');
            if (text.includes('create')) text = text.replace('create', 'created');
            else if (text.includes('update')) text = text.replace('update', 'updated');
            else if (text.includes('delete')) text = text.replace('delete', 'deleted');
        } else if (!text) {
            text = "performed an action";
        }

        let extra = "";
        if (log.details) {
            const nameOrTitle = log.details.name || log.details.queue_name || log.details.email || log.details.title || log.details.status;
            if (nameOrTitle && typeof nameOrTitle === 'string') {
                extra = ` "${nameOrTitle}"`;
            }
        }
        
        return (
            <span>
                <span className="font-semibold text-white">{log.user_email || "System"}</span> {text}
                <span className="text-violet-300">{extra}</span>
                {log.org_name && <span> in branch <span className="font-semibold text-emerald-400">{log.org_name}</span></span>}
            </span>
        );
    };

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        const today = new Date();
        const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return isToday ? timeStr : `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
    };

    return (
        <div className="bg-slate-900 rounded-2xl border border-white/10 shadow-xl overflow-hidden h-full flex flex-col">
            <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between shrink-0">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Recent Activity
                </h2>
                <button onClick={loadLogs} disabled={isLoading} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-40">
                    <svg className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 min-h-[400px]">
                {isLoading && logs.length === 0 ? (
                    <div className="space-y-6">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex gap-4 animate-pulse">
                                <div className="w-3 h-3 rounded-full bg-slate-700 mt-1.5 shrink-0" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-4 bg-slate-700 rounded w-3/4" />
                                    <div className="h-3 bg-slate-800 rounded w-1/4" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                        <svg className="w-8 h-8 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                        <p className="text-sm">No recent activity.</p>
                    </div>
                ) : (
                    <div className="relative border-l-2 border-slate-800 ml-1.5 space-y-8">
                        {logs.map((log) => (
                            <div key={log.id} className="relative pl-6 group">
                                {/* Timeline Dot */}
                                <div className={`absolute -left-[5px] top-1.5 w-2 h-2 rounded-full ${getActionColor(log.event_type)} shadow-lg ring-4 ring-slate-900 group-hover:scale-125 transition-transform`} />
                                
                                <div className="flex flex-col flex-1">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-sm text-slate-300 leading-snug">
                                                {getActionText(log)}
                                            </p>
                                            <span className="text-xs text-slate-500 mt-1 font-medium tracking-wide uppercase">
                                                {formatTime(log.created_at)}
                                            </span>
                                        </div>
                                        <button 
                                            onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                                            className={`p-1.5 rounded-md transition-colors ${expandedLogId === log.id ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
                                            title="View Details"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        </button>
                                    </div>
                                    
                                    {expandedLogId === log.id && (
                                        <div className="mt-3 p-3 bg-slate-950/50 rounded-lg border border-slate-800/60 overflow-x-auto shadow-inner">
                                            <pre className="text-xs text-emerald-400/90 font-mono whitespace-pre-wrap break-words">
                                                {JSON.stringify(log, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
