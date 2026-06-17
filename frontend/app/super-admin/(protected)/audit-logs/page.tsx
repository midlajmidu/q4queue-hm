"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { AuditLogDetail } from "@/types/api";

export default function SuperAdminAuditLogsPage() {
    const [logs, setLogs] = useState<AuditLogDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const limit = 20;

    const loadData = async (currentOffset: number) => {
        setLoading(true);
        try {
            const res = await api.getAuditLogs(limit, currentOffset);
            setLogs(res.items || []);
            setTotal(res.total || 0);
        } catch (error) {
            console.error("Failed to load audit logs", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData(offset);
    }, [offset]);

    const formatAction = (eventType: string) => {
        return eventType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const getActionColor = (action: string) => {
        const a = action.toLowerCase();
        if (a.includes('create') || a.includes('add') || a.includes('join')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        if (a.includes('delete') || a.includes('remove') || a.includes('cancel')) return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
        if (a.includes('update') || a.includes('edit')) return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
        if (a.includes('login') || a.includes('auth')) return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    };

    const formatDate = (isoString: string) => {
        const d = new Date(isoString);
        return {
            date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
        };
    };

    const formatDetails = (details: Record<string, any> | null) => {
        if (!details || Object.keys(details).length === 0) return <span className="text-slate-600">—</span>;
        
        // Remove 'id' or other noise if we want, but let's just show up to 3 keys
        const entries = Object.entries(details);
        return (
            <div className="flex flex-wrap gap-1.5 items-center">
                {entries.slice(0, 3).map(([k, v]) => (
                    <div key={k} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-950 text-slate-300 border border-slate-800" title={`${k}: ${v}`}>
                        <span className="text-slate-500 mr-1">{k}:</span>
                        <span className="truncate max-w-[120px]">{String(v)}</span>
                    </div>
                ))}
                {entries.length > 3 && (
                    <span className="text-[10px] font-medium text-slate-500 px-1">+{entries.length - 3} more</span>
                )}
            </div>
        );
    };

    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Audit Logs
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">Track every action across all organizations and the entire platform.</p>
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-800/50 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 w-48">Action</th>
                                <th className="px-6 py-4">Organization</th>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">IP Address</th>
                                <th className="px-6 py-4 max-w-sm">Details</th>
                                <th className="px-6 py-4 text-right">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="flex justify-center items-center gap-2 text-slate-400">
                                            <svg className="animate-spin w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Loading audit logs...
                                        </div>
                                    </td>
                                </tr>
                            ) : logs.length > 0 ? (
                                logs.map(log => {
                                    const { date, time } = formatDate(log.created_at);
                                    return (
                                        <tr key={log.id} className="hover:bg-slate-800/30 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${getActionColor(log.event_type)}`}>
                                                    {formatAction(log.event_type)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-7 h-7 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0 shadow-sm">
                                                        {(log.org_name || "S").charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-sm text-slate-300 font-medium group-hover:text-white transition-colors">
                                                        {log.org_name || <span className="text-slate-500 italic">System</span>}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">
                                                        {(log.user_email || "S").charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                                                        {log.user_email || <span className="text-slate-500 italic">System User</span>}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5 text-slate-400 font-mono text-xs">
                                                    <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                                                    {log.ip_address || "unknown"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 max-w-sm">
                                                {formatDetails(log.details)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="text-sm text-slate-300 font-medium">{date}</div>
                                                <div className="text-xs text-slate-500">{time}</div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        No audit logs found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {total > 0 && (
                    <div className="px-6 py-4 border-t border-slate-800/50 flex items-center justify-between text-sm">
                        <span className="text-slate-500">
                            Showing <span className="font-semibold text-slate-300">{Math.min(offset + 1, total)}</span> to <span className="font-semibold text-slate-300">{Math.min(offset + limit, total)}</span> of <span className="font-semibold text-slate-300">{total}</span> logs
                        </span>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setOffset(Math.max(0, offset - limit))}
                                disabled={offset === 0}
                                className="px-3 py-1.5 text-slate-400 bg-slate-900 border border-slate-700 hover:bg-slate-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Previous
                            </button>
                            <button 
                                onClick={() => setOffset(offset + limit)}
                                disabled={offset + limit >= total}
                                className="px-3 py-1.5 text-slate-400 bg-slate-900 border border-slate-700 hover:bg-slate-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
