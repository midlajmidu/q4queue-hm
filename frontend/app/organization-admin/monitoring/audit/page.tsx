"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { Activity, Shield, ChevronLeft, ChevronRight } from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useBranchFilter } from "@/context/BranchFilterContext";

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const { selectedBranchId } = useBranchFilter();

    // Reset to page 1 when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedBranchId]);

    const totalPages = Math.max(1, Math.ceil(logs.length / itemsPerPage));
    
    const sortedLogs = useMemo(() => {
        return [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [logs]);

    const paginatedLogs = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return sortedLogs.slice(start, start + itemsPerPage);
    }, [sortedLogs, currentPage]);

    useEffect(() => {
        const loadData = () => {
            api.getOrgAdminAudit(selectedBranchId || undefined)
                .then(res => {
                    setLogs(res);
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    setLoading(false);
                });
        };
        
        loadData();
        const interval = setInterval(loadData, 15000); // 15s polling
        return () => clearInterval(interval);
    }, [selectedBranchId]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
                <p className="text-sm text-slate-500 mt-1">Review security and administrative actions across all branches.</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                    <h2 className="font-bold text-slate-900 flex items-center gap-2">
                        <Activity size={18} className="text-indigo-600" />
                        Security & Audit Events
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                                <th className="p-4">Time</th>
                                <th className="p-4">Branch</th>
                                <th className="p-4">User</th>
                                <th className="p-4">Action</th>
                                <th className="p-4">Entity</th>
                                <th className="p-4">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500">
                                        No recent audit logs.
                                    </td>
                                </tr>
                            ) : (
                                paginatedLogs.map((log: any, idx: number) => {
                                    // Determine action color
                                    let actionColor = 'bg-slate-100 text-slate-800';
                                    const act = log.action ? log.action.toUpperCase() : '';
                                    if (act.includes('DELETE') || act.includes('REMOVE')) actionColor = 'bg-rose-100 text-rose-800';
                                    else if (act.includes('CREATE') || act.includes('ADD')) actionColor = 'bg-emerald-100 text-emerald-800';
                                    else if (act.includes('UPDATE') || act.includes('EDIT')) actionColor = 'bg-amber-100 text-amber-800';
                                    else if (act.includes('LOGIN') || act.includes('AUTH')) actionColor = 'bg-blue-100 text-blue-800';

                                    // Format Details
                                    let detailsPills: { key: string, value: string }[] = [];
                                    if (log.details) {
                                        try {
                                            const parsed = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
                                            if (Object.keys(parsed).length > 0) {
                                                detailsPills = Object.entries(parsed).map(([k, v]) => ({ key: k, value: String(v) }));
                                            }
                                        } catch (e) {
                                            detailsPills = [{ key: "info", value: String(log.details) }];
                                        }
                                    }

                                    return (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="p-4 text-sm text-slate-500 whitespace-nowrap">
                                                {new Date(log.timestamp).toLocaleString(undefined, {
                                                    year: 'numeric', month: 'short', day: 'numeric',
                                                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                                                })}
                                            </td>
                                            <td className="p-4 font-medium text-slate-900">{log.branch}</td>
                                            <td className="p-4 font-medium text-slate-700">{log.user_email}</td>
                                            <td className="p-4 text-slate-700">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${actionColor}`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="p-4 text-slate-600" title={log.entity_id}>
                                                {log.entity_type && log.entity_id ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-medium capitalize">{log.entity_type.replace('_', ' ')}</span>
                                                        <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 font-mono text-[10px]">
                                                            #{log.entity_id.split('-')[0]}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="font-medium capitalize">{log.entity_type ? log.entity_type.replace('_', ' ') : "-"}</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-wrap gap-1.5 max-w-sm">
                                                    {detailsPills.length > 0 ? (
                                                        detailsPills.map((p, i) => (
                                                            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 shadow-sm text-[11px]">
                                                                <span className="text-slate-400 font-medium capitalize">{p.key.replace('_', ' ')}:</span>
                                                                <span className="text-slate-700 font-mono max-w-[200px] truncate" title={p.value}>{p.value}</span>
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-slate-400">-</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
                        <div className="text-xs text-slate-500">
                            Showing <span className="font-medium text-slate-900">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-medium text-slate-900">{Math.min(currentPage * itemsPerPage, logs.length)}</span> of <span className="font-medium text-slate-900">{logs.length}</span> logs
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <div className="px-2 text-xs font-medium text-slate-600">
                                Page {currentPage} of {totalPages}
                            </div>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-white disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
