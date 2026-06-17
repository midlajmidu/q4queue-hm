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

    const formatDate = (isoString: string) => {
        const d = new Date(isoString);
        return d.toLocaleString("en-US", {
            month: "short", day: "numeric", year: "numeric",
            hour: "numeric", minute: "2-digit", hour12: true
        });
    };

    const formatDetails = (details: Record<string, any> | null) => {
        if (!details) return "—";
        const parts = [];
        for (const [key, value] of Object.entries(details)) {
            parts.push(`${key}: ${value}`);
        }
        return parts.join(", ") || "—";
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
                                <th className="px-6 py-4">Action</th>
                                <th className="px-6 py-4">Organization</th>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4 max-w-xs">Details</th>
                                <th className="px-6 py-4">Timestamp</th>
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
                                logs.map(log => (
                                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                                                {formatAction(log.event_type)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-300 font-medium">
                                            {log.org_name || <span className="text-slate-500 italic">System</span>}
                                        </td>
                                        <td className="px-6 py-4 text-slate-300">
                                            {log.user_email || <span className="text-slate-500 italic">System User</span>}
                                        </td>
                                        <td className="px-6 py-4 text-slate-400 text-xs max-w-xs truncate" title={formatDetails(log.details)}>
                                            {formatDetails(log.details)}
                                        </td>
                                        <td className="px-6 py-4 text-slate-400 text-xs whitespace-nowrap tabular-nums">
                                            {formatDate(log.created_at)}
                                        </td>
                                    </tr>
                                ))
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
