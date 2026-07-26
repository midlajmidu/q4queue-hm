"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { Users, ExternalLink, ArrowUp, ArrowDown, Activity, Building2 } from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useBranchFilter } from "@/context/BranchFilterContext";
import BranchSelector from "@/components/organization-admin/BranchSelector";

export default function SessionsMonitoringPage() {
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortField, setSortField] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const { selectedBranchId } = useBranchFilter();

    useEffect(() => {
        const loadData = () => {
            api.getOrgAdminSessions(selectedBranchId || undefined)
                .then(res => {
                    setSessions(res);
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

    const processedSessions = useMemo(() => {
        return sessions.map((s, idx) => {
            const loadStatus = s.load_status || "Normal";
            const loadPercentage = typeof s.load_percentage === 'number' ? s.load_percentage : 0;

            return {
                ...s,
                originalIdx: idx,
                loadStatus,
                loadPercentage,
                staffPresentNum: parseInt(s.active_staff_present || "0", 10),
                staffTotalNum: parseInt(s.active_staff_total || "0", 10),
            };
        });
    }, [sessions]);

    const sortedSessions = useMemo(() => {
        if (!sortField) return processedSessions;

        return [...processedSessions].sort((a, b) => {
            let aVal, bVal;

            switch (sortField) {
                case 'branch':
                    aVal = a.branch?.toLowerCase() || '';
                    bVal = b.branch?.toLowerCase() || '';
                    break;
                case 'session_name':
                    aVal = a.session_name?.toLowerCase() || '';
                    bVal = b.session_name?.toLowerCase() || '';
                    break;
                case 'load_status':
                    const loadOrder = { 'Normal': 1, 'Heavy': 2, 'Critical': 3 };
                    aVal = loadOrder[a.loadStatus as keyof typeof loadOrder] || 0;
                    bVal = loadOrder[b.loadStatus as keyof typeof loadOrder] || 0;
                    break;
                case 'staff_present':
                    aVal = a.staffPresentNum;
                    bVal = b.staffPresentNum;
                    break;
                case 'status':
                    aVal = a.status?.toLowerCase() || '';
                    bVal = b.status?.toLowerCase() || '';
                    break;
                default:
                    return 0;
            }

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [processedSessions, sortField, sortDirection]);

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const SortHeader = ({ field, label, align = 'left' }: { field: string, label: string, align?: 'left' | 'center' | 'right' }) => (
        <th
            className={`px-6 py-3.5 cursor-pointer hover:bg-slate-100 transition-colors group select-none ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'}`}
            onClick={() => handleSort(field)}
        >
            <div className={`flex items-center gap-1 ${align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'}`}>
                <span className="group-hover:text-indigo-600 transition-colors">{label}</span>
                <div className="flex flex-col -space-y-1">
                    <ArrowUp size={10} className={`${sortField === field && sortDirection === 'asc' ? 'text-indigo-600' : 'text-slate-300 group-hover:text-indigo-300'}`} />
                    <ArrowDown size={10} className={`${sortField === field && sortDirection === 'desc' ? 'text-indigo-600' : 'text-slate-300 group-hover:text-indigo-300'}`} />
                </div>
            </div>
        </th>
    );

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center gap-3 text-slate-400">
                <LoadingSpinner size="md" />
                <span className="text-sm font-medium">Loading data...</span>
            </div>
        );
    }

    const activeCount = sessions.filter(s => s.status === 'Active').length;
    const inactiveCount = sessions.filter(s => s.status !== 'Active').length;
    const branchCount = new Set(sessions.map(s => s.branch)).size;

    return (
        <div className="space-y-6">
            {/* Premium Header & Controls */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 pb-6 border-b border-slate-200/60">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500">
                        Live Session Monitoring
                    </h1>
                    <div className="flex items-center flex-wrap gap-2.5 text-sm text-slate-500 mt-2">
                        <span className="leading-none font-medium text-slate-500">Monitor all active sessions across all branches in real-time.</span>
                    </div>
                </div>
                <div className="shrink-0">
                    <BranchSelector />
                </div>
            </div>

            {/* Summary Stat Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4.5 flex items-center justify-between">
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Active Sessions</p>
                        <p className="text-2xl font-bold tracking-tight text-slate-900 mt-1">{activeCount}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Currently open</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50/80 border border-emerald-100/80 flex items-center justify-center shrink-0">
                        <Activity size={18} className="text-emerald-600" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4.5 flex items-center justify-between">
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Branches</p>
                        <p className="text-2xl font-bold tracking-tight text-slate-900 mt-1">{branchCount}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">With active sessions</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50/80 border border-indigo-100/80 flex items-center justify-center shrink-0">
                        <Building2 size={18} className="text-indigo-600" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4.5 flex items-center justify-between">
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Inactive Sessions</p>
                        <p className="text-2xl font-bold tracking-tight text-slate-900 mt-1">{inactiveCount}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Closed or paused</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100/80 border border-slate-200/80 flex items-center justify-center shrink-0">
                        <Users size={18} className="text-slate-500" />
                    </div>
                </div>
            </div>

            {/* Sessions Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                            <Activity size={16} className="text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-slate-900">Operational Status</h2>
                            <p className="text-xs text-slate-400 mt-0.5">{sessions.length} sessions tracked</p>
                        </div>
                    </div>
                    {/* Live indicator */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        <span className="text-xs font-semibold text-emerald-700">Live</span>
                    </div>
                </div>

                {/* Mobile View */}
                <div className="block md:hidden divide-y divide-slate-100 bg-white">
                    {sessions.length === 0 ? (
                        <div className="py-20 text-center px-6">
                            <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
                                <Activity size={24} className="text-slate-300" />
                            </div>
                            <h3 className="text-sm font-semibold text-slate-700">No active sessions</h3>
                            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">When branches start serving customers, sessions will appear here in real-time.</p>
                        </div>
                    ) : (
                        sortedSessions.map((s: any) => {
                            const idx = s.originalIdx;
                            return (
                                <div key={idx} className="p-4 space-y-4 hover:bg-slate-50/60 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h4 className="font-semibold text-slate-900 text-sm leading-snug">{s.branch}</h4>
                                            <p className="text-xs text-slate-400 font-medium mt-0.5">{s.session_name}</p>
                                        </div>
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${s.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                                            {s.status === 'Active' && (
                                                <span className="relative flex h-1.5 w-1.5">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                                </span>
                                            )}
                                            {s.status}
                                        </span>
                                    </div>
                                    <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 text-xs">
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500 font-medium">Staff Present</span>
                                            <span className="font-semibold text-slate-900">{s.staffPresentNum}/{s.staffTotalNum} staff</span>
                                        </div>
                                    </div>
                                    <a
                                        href={`/organization-admin/branches/${s.branch_id}`}
                                        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-colors"
                                    >
                                        Branch Details
                                        <ExternalLink size={13} />
                                    </a>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] uppercase tracking-widest text-slate-400 font-semibold">
                                <SortHeader field="branch" label="Branch / Session" />
                                <SortHeader field="staff_present" label="Staff Present" align="center" />
                                <SortHeader field="status" label="Status" />
                                <th className="px-6 py-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[13px]">
                            {sessions.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-20 text-center">
                                        <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-4">
                                            <Activity size={24} className="text-slate-300" />
                                        </div>
                                        <h3 className="text-sm font-semibold text-slate-700">No active sessions</h3>
                                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">When branches start serving customers, they will appear here in real-time.</p>
                                    </td>
                                </tr>
                            ) : (
                                sortedSessions.map((s: any) => {
                                    const idx = s.originalIdx;
                                    return (
                                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="px-6 py-3.5">
                                                <div className="font-semibold text-slate-900">{s.branch}</div>
                                                <div className="text-xs text-slate-400 mt-0.5">{s.session_name}</div>
                                            </td>
                                            <td className="px-6 py-3.5 text-center">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                                    <Users size={12} className="text-slate-400" />
                                                    {s.staffPresentNum}/{s.staffTotalNum}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
                                                    {s.status === 'Active' && (
                                                        <span className="relative flex h-1.5 w-1.5">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                                        </span>
                                                    )}
                                                    {s.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3.5 text-right">
                                                <a
                                                    href={`/organization-admin/branches/${s.branch_id}`}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-colors"
                                                >
                                                    <ExternalLink size={13} />
                                                    Branch Details
                                                </a>
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
