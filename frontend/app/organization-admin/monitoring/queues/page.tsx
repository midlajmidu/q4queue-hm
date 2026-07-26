"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { ListFilter, ExternalLink, ChevronLeft, ChevronRight, Building2 } from "lucide-react";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useBranchFilter } from "@/context/BranchFilterContext";
import BranchSelector from "@/components/organization-admin/BranchSelector";

export default function QueuesMonitoringPage() {
    const [queues, setQueues] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState<string>("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const { selectedBranchId } = useBranchFilter();

    const uniqueSessions = useMemo(() => {
        const sessions = queues.map(q => q.session_name).filter(Boolean);
        return Array.from(new Set(sessions));
    }, [queues]);

    const filteredQueues = useMemo(() => {
        if (!selectedSession) return queues;
        return queues.filter(q => q.session_name === selectedSession);
    }, [queues, selectedSession]);

    useEffect(() => {
        setCurrentPage(1);
    }, [selectedSession, selectedBranchId]);

    const totalPages = Math.max(1, Math.ceil(filteredQueues.length / itemsPerPage));
    const paginatedQueues = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredQueues.slice(start, start + itemsPerPage);
    }, [filteredQueues, currentPage]);

    useEffect(() => {
        const loadData = () => {
            api.getOrgAdminQueues(selectedBranchId || undefined)
                .then(res => {
                    setQueues(res);
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    setLoading(false);
                });
        };

        loadData();
        const interval = setInterval(loadData, 15000);
        return () => clearInterval(interval);
    }, [selectedBranchId]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center gap-3 text-slate-400">
                <LoadingSpinner size="md" />
                <span className="text-sm font-medium">Loading data...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Premium Header & Controls */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 pb-6 border-b border-slate-200/60">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500">
                        Live Queue Monitoring
                    </h1>
                    <div className="flex items-center flex-wrap gap-2.5 text-sm text-slate-500 mt-2">
                        <span className="leading-none font-medium text-slate-500">Monitor all active queues across all branches in real-time.</span>
                    </div>
                </div>
                <div className="shrink-0">
                    <BranchSelector />
                </div>
            </div>

            {/* Queue Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                            <ListFilter size={16} className="text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-slate-900">Customer Flow</h2>
                            <p className="text-xs text-slate-400 mt-0.5">{filteredQueues.length} queues active</p>
                        </div>
                    </div>
                    {uniqueSessions.length > 0 && (
                        <div className="relative">
                            <select
                                value={selectedSession}
                                onChange={(e) => setSelectedSession(e.target.value)}
                                className="appearance-none pl-3 pr-8 py-2 bg-white border border-slate-200/80 text-slate-700 text-sm font-medium rounded-xl hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm cursor-pointer w-full sm:w-auto"
                            >
                                <option value="">All Sessions</option>
                                {uniqueSessions.map(s => (
                                    <option key={s as string} value={s as string}>{s as string}</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                    )}
                </div>

                {/* Mobile View */}
                <div className="block md:hidden divide-y divide-slate-100 bg-white">
                    {paginatedQueues.length === 0 ? (
                        <div className="py-20 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
                                <ListFilter size={24} className="text-slate-300" />
                            </div>
                            <p className="text-sm font-semibold text-slate-700">No queues found</p>
                            <p className="text-xs text-slate-400 mt-1">Adjust the session or branch filter.</p>
                        </div>
                    ) : (
                        paginatedQueues.map((q: any, idx: number) => {
                            const loadPct = q.load_percentage || 0;
                            const isCritical = loadPct >= 90;
                            const isHeavy = loadPct >= 75;
                            const barColor = isCritical ? 'bg-rose-500' : isHeavy ? 'bg-amber-500' : 'bg-indigo-500';
                            const textColor = isCritical ? 'text-rose-600' : isHeavy ? 'text-amber-600' : 'text-slate-700';
                            const statusLabel = isCritical ? 'Critical' : isHeavy ? 'Heavy' : 'Normal';
                            const waitingBadge = isCritical ? 'bg-rose-50 text-rose-700 border border-rose-100' : isHeavy ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-slate-100 text-slate-600 border border-slate-200';

                            return (
                                <div key={idx} className="p-4 space-y-4 hover:bg-slate-50/60 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h4 className="font-semibold text-slate-900 text-sm leading-snug">{q.branch}</h4>
                                            <p className="text-xs text-slate-400 font-medium mt-0.5">{q.queue_name}</p>
                                        </div>
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${q.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                                            {q.status === 'Active' && (
                                                <span className="relative flex h-1.5 w-1.5">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                                </span>
                                            )}
                                            {q.status}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 bg-slate-50/50 rounded-xl p-3 border border-slate-100 text-xs">
                                        <div className="col-span-2 space-y-1.5">
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-500 font-medium">Queue Load</span>
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${waitingBadge}`}>
                                                    {q.waiting || 0} waiting
                                                    {statusLabel !== 'Normal' && <span>· {statusLabel}</span>}
                                                </span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`} style={{ width: `${loadPct}%` }} />
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center py-0.5 border-t border-slate-100/60 pt-2">
                                            <span className="text-slate-500 font-medium">Served Today</span>
                                            <span className="font-bold text-slate-900">{q.served_today || 0}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-0.5 border-t border-slate-100/60 pt-2">
                                            <span className="text-slate-500 font-medium">Avg Wait</span>
                                            <span className="font-bold text-slate-900">{q.avg_wait_time || "0m"}</span>
                                        </div>
                                    </div>
                                    <Link
                                        href={`/organization-admin/branches/${q.branch_id}`}
                                        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-colors"
                                    >
                                        Branch Details
                                        <ExternalLink size={13} />
                                    </Link>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] uppercase tracking-widest text-slate-400 font-semibold">
                                <th className="px-6 py-3.5">Branch</th>
                                <th className="px-6 py-3.5">Queue Name</th>
                                <th className="px-6 py-3.5 text-right">Queue Load</th>
                                <th className="px-6 py-3.5 text-right">Served Today</th>
                                <th className="px-6 py-3.5 text-right">Avg Wait</th>
                                <th className="px-6 py-3.5">Status</th>
                                <th className="px-6 py-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[13px]">
                            {paginatedQueues.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center">
                                        <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
                                            <ListFilter size={24} className="text-slate-300" />
                                        </div>
                                        <p className="text-sm font-semibold text-slate-700">No queues found</p>
                                        <p className="text-xs text-slate-400 mt-1">Adjust the session or branch filter to see queues.</p>
                                    </td>
                                </tr>
                            ) : (
                                paginatedQueues.map((q: any, idx: number) => {
                                    const loadPct = q.load_percentage || 0;
                                    const isCritical = loadPct >= 90;
                                    const isHeavy = loadPct >= 75;
                                    const barColor = isCritical ? 'bg-rose-500' : isHeavy ? 'bg-amber-500' : 'bg-indigo-500';
                                    const waitingBadge = isCritical ? 'bg-rose-50 text-rose-700 border border-rose-100' : isHeavy ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-slate-100 text-slate-600 border border-slate-200';
                                    const statusLabel = isCritical ? 'Critical' : isHeavy ? 'Heavy' : null;

                                    return (
                                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-6 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <Building2 size={14} className="text-slate-400 shrink-0" />
                                                    <span className="font-semibold text-slate-900">{q.branch}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5 font-medium text-slate-600">{q.queue_name}</td>
                                            <td className="px-6 py-3.5">
                                                <div className="flex flex-col gap-1.5 w-36 ml-auto">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${waitingBadge}`}>
                                                            {q.waiting || 0} waiting
                                                            {statusLabel && <span>· {statusLabel}</span>}
                                                        </span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`} style={{ width: `${loadPct}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5 text-right font-medium text-slate-700">{q.served_today || 0}</td>
                                            <td className="px-6 py-3.5 text-right font-semibold text-slate-600">{q.avg_wait_time || "0m"}</td>
                                            <td className="px-6 py-3.5">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${q.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                                                    {q.status === 'Active' && (
                                                        <span className="relative flex h-1.5 w-1.5">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                                        </span>
                                                    )}
                                                    {q.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3.5 text-right">
                                                <Link
                                                    href={`/organization-admin/branches/${q.branch_id}`}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-colors"
                                                >
                                                    <ExternalLink size={13} />
                                                    Branch Details
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-white">
                        <div className="text-xs text-slate-500">
                            Showing <span className="font-semibold text-slate-900">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-semibold text-slate-900">{Math.min(currentPage * itemsPerPage, filteredQueues.length)}</span> of <span className="font-semibold text-slate-900">{filteredQueues.length}</span> queues
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <div className="px-3 py-1 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg">
                                {currentPage} / {totalPages}
                            </div>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
