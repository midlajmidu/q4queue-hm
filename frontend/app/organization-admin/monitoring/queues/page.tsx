"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { api } from "@/lib/api";
import type { QueueMonitorItem } from "@/types/api";
import {
    Activity,
    Users,
    Search,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    CheckCircle2,
    Layers,
    ArrowUpRight,
    ExternalLink,
    ShieldCheck,
    ShieldAlert,
    X
} from "lucide-react";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useBranchFilter } from "@/context/BranchFilterContext";
import BranchSelector from "@/components/organization-admin/BranchSelector";

export default function LiveQueuesMonitoringPage() {
    const [queues, setQueues] = useState<QueueMonitorItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const itemsPerPage = 10;

    const { selectedBranchId } = useBranchFilter();

    const loadData = useCallback(async (showRefreshing = false) => {
        if (showRefreshing) setIsRefreshing(true);
        try {
            const res = await api.getOrgAdminQueues(selectedBranchId || undefined);
            setQueues(res || []);
        } catch (err) {
            console.error("Failed to load live queues", err);
        } finally {
            setLoading(false);
            if (showRefreshing) setIsRefreshing(false);
        }
    }, [selectedBranchId]);

    useEffect(() => {
        setLoading(true);
        loadData();
        const interval = setInterval(() => loadData(false), 12000);
        return () => clearInterval(interval);
    }, [loadData]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedBranchId]);

    // Summary
    const summary = useMemo(() => {
        const totalQueues = queues.length;
        const activeQueues = queues.filter(q => q.is_active || q.status?.toLowerCase() === "active").length;
        const totalWaiting = queues.reduce((sum, q) => sum + (q.waiting || 0), 0);
        const totalServing = queues.reduce((sum, q) => sum + (q.serving || 0), 0);
        const totalServed = queues.reduce((sum, q) => sum + (q.served_today || 0), 0);
        const atRiskCount = queues.filter(q => (q.load_percentage || 0) >= 75).length;
        return { totalQueues, activeQueues, totalWaiting, totalServing, totalServed, atRiskCount };
    }, [queues]);

    // Filtered
    const filteredQueues = useMemo(() => {
        if (!searchQuery.trim()) return queues;
        const query = searchQuery.toLowerCase();
        return queues.filter(q => {
            return q.queue_name?.toLowerCase().includes(query) ||
                   q.branch?.toLowerCase().includes(query) ||
                   q.prefix?.toLowerCase().includes(query) ||
                   q.current_token?.toLowerCase().includes(query);
        });
    }, [queues, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filteredQueues.length / itemsPerPage));
    const paginatedQueues = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredQueues.slice(start, start + itemsPerPage);
    }, [filteredQueues, currentPage]);

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
            {/* ── Premium Header & Controls ── */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 pb-6 border-b border-slate-200/60">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500">
                        Live Queue Monitoring
                    </h1>
                    <div className="flex items-center flex-wrap gap-2.5 text-sm text-slate-500 mt-2">
                        <span className="leading-none font-medium text-slate-500">Monitor all active queues across branches in real-time.</span>
                    </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    <BranchSelector />
                    <button
                        onClick={() => loadData(true)}
                        disabled={isRefreshing}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                        <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
                        {isRefreshing ? "Refreshing..." : "Refresh"}
                    </button>
                </div>
            </div>

            {/* ── Stat Cards (same design as Staff Monitoring) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4.5 flex items-center justify-between">
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Active Queues</p>
                        <p className="text-2xl font-bold tracking-tight text-slate-900 mt-1">{summary.activeQueues}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{summary.totalWaiting} customers waiting</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50/80 border border-indigo-100/80 flex items-center justify-center shrink-0">
                        <Activity size={18} className="text-indigo-600" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4.5 flex items-center justify-between">
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Served Today</p>
                        <p className="text-2xl font-bold tracking-tight text-slate-900 mt-1">{summary.totalServed}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{summary.totalServing} currently serving</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50/80 border border-emerald-100/80 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={18} className="text-emerald-600" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4.5 flex items-center justify-between">
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Load Health</p>
                        {summary.atRiskCount > 0 ? (
                            <>
                                <p className="text-2xl font-bold tracking-tight text-amber-600 mt-1">{summary.atRiskCount}</p>
                                <p className="text-[11px] text-amber-600 mt-0.5">queues at ≥75% capacity</p>
                            </>
                        ) : (
                            <>
                                <p className="text-2xl font-bold tracking-tight text-slate-900 mt-1">0</p>
                                <p className="text-[11px] text-emerald-600 mt-0.5">All queues within capacity</p>
                            </>
                        )}
                    </div>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        summary.atRiskCount > 0
                            ? "bg-rose-50/80 border border-rose-100/80"
                            : "bg-emerald-50/80 border border-emerald-100/80"
                    }`}>
                        {summary.atRiskCount > 0
                            ? <ShieldAlert size={18} className="text-rose-600" />
                            : <ShieldCheck size={18} className="text-emerald-600" />
                        }
                    </div>
                </div>
            </div>

            {/* ── Queue Table Card ── */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                {/* Table Header (same pattern as Staff "Organization Staff" header) */}
                <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                            <Activity size={16} className="text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-slate-900">Queue Operations</h2>
                            <p className="text-xs text-slate-400 mt-0.5">{filteredQueues.length} queues across branches</p>
                        </div>
                    </div>
                    {/* Search */}
                    <div className="relative w-full sm:w-64">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search queues..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-9 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-400 transition-all"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <X size={13} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Mobile View */}
                <div className="block md:hidden divide-y divide-slate-100 bg-white">
                    {paginatedQueues.length === 0 ? (
                        <div className="p-16 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
                                <Layers size={24} className="text-slate-300" />
                            </div>
                            <p className="text-sm font-semibold text-slate-700">No queues found</p>
                            <p className="text-xs text-slate-400 mt-1">Try adjusting the branch filter or search.</p>
                        </div>
                    ) : (
                        paginatedQueues.map((q) => {
                            const isServingActive = q.current_token && q.current_token !== "—" && q.current_token !== "-";
                            const targetLink = q.active_session_id
                                ? `/${q.branch_slug}/dashboard/queues/${q.id}/sessions/${q.active_session_id}`
                                : `/${q.branch_slug}/dashboard/queues/${q.id}`;

                            return (
                                <div key={q.id} className="p-4 space-y-4 hover:bg-slate-50/60 transition-colors">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                                                {(q.queue_name || "Q").charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-slate-900 text-sm leading-snug">{q.queue_name}</h4>
                                                {q.prefix && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold mt-0.5 bg-slate-100 text-slate-600 border border-slate-200">
                                                        {q.prefix}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {isServingActive ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                <span className="relative flex h-1.5 w-1.5">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                                </span>
                                                {q.current_token}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 bg-slate-50 text-slate-600 border border-slate-200">
                                                Idle
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 gap-2 bg-slate-50/50 rounded-xl p-3 border border-slate-100 text-xs">
                                        <div className="flex justify-between items-center py-0.5">
                                            <span className="text-slate-500 font-medium">Branch</span>
                                            <span className="font-semibold text-slate-900">{q.branch}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-0.5 border-t border-slate-100/60 pt-1.5">
                                            <span className="text-slate-500 font-medium">Waiting</span>
                                            <span className="font-semibold text-slate-800">{q.waiting}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-0.5 border-t border-slate-100/60 pt-1.5">
                                            <span className="text-slate-500 font-medium">Served Today</span>
                                            <span className="font-semibold text-slate-900">{q.served_today}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-0.5 border-t border-slate-100/60 pt-1.5">
                                            <span className="text-slate-500 font-medium">Avg Wait</span>
                                            <span className="font-semibold text-slate-900">{q.avg_wait_time && q.avg_wait_time !== "0m" ? q.avg_wait_time : "—"}</span>
                                        </div>
                                    </div>
                                    <Link
                                        href={targetLink}
                                        target="_blank"
                                        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-colors"
                                    >
                                        Open Queue View
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
                                <th className="px-6 py-3.5">Queue</th>
                                <th className="px-6 py-3.5">Branch</th>
                                <th className="px-6 py-3.5">Now Serving</th>
                                <th className="px-6 py-3.5">Waiting</th>
                                <th className="px-6 py-3.5">Served</th>
                                <th className="px-6 py-3.5">Avg Wait</th>
                                <th className="px-6 py-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedQueues.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center">
                                        <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
                                            <Layers size={24} className="text-slate-300" />
                                        </div>
                                        <p className="text-sm font-semibold text-slate-700">No queues found</p>
                                        <p className="text-xs text-slate-400 mt-1">Try adjusting the branch filter or search.</p>
                                    </td>
                                </tr>
                            ) : (
                                paginatedQueues.map((q) => {
                                    const loadPct = q.load_percentage || 0;
                                    const isServingActive = q.current_token && q.current_token !== "—" && q.current_token !== "-";
                                    const targetLink = q.active_session_id
                                        ? `/${q.branch_slug}/dashboard/queues/${q.id}/sessions/${q.active_session_id}`
                                        : `/${q.branch_slug}/dashboard/queues/${q.id}`;

                                    return (
                                        <tr key={q.id} className="hover:bg-slate-50/60 transition-colors">
                                            {/* Queue Name */}
                                            <td className="px-6 py-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="font-semibold text-slate-900 text-sm">{q.queue_name}</span>
                                                    {q.prefix && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                                            {q.prefix}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Branch */}
                                            <td className="px-6 py-3.5 text-sm font-medium text-slate-700">{q.branch}</td>

                                            {/* Now Serving */}
                                            <td className="px-6 py-3.5">
                                                {isServingActive ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                        <span className="relative flex h-1.5 w-1.5">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                                        </span>
                                                        {q.current_token}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200">
                                                        Idle
                                                    </span>
                                                )}
                                            </td>

                                            {/* Waiting */}
                                            <td className="px-6 py-3.5">
                                                {q.waiting > 0 ? (
                                                    <span className={`text-sm font-semibold ${
                                                        loadPct >= 90 ? "text-rose-600" :
                                                        loadPct >= 75 ? "text-amber-600" :
                                                        "text-slate-900"
                                                    }`}>
                                                        {q.waiting}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-slate-400">0</span>
                                                )}
                                            </td>

                                            {/* Served */}
                                            <td className="px-6 py-3.5 text-sm text-slate-500">{q.served_today}</td>

                                            {/* Avg Wait */}
                                            <td className="px-6 py-3.5 text-sm text-slate-500">
                                                {q.avg_wait_time && q.avg_wait_time !== "0m" ? q.avg_wait_time : "—"}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-6 py-3.5 text-right">
                                                <Link
                                                    href={targetLink}
                                                    target="_blank"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-colors"
                                                >
                                                    <ExternalLink size={13} />
                                                    Queue
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination (same design as Staff page) */}
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
