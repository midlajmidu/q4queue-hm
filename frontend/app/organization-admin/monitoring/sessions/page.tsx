"use client";

import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { Users, ExternalLink, ArrowUp, ArrowDown, Activity, ChevronRight, Flame, CheckCircle2 } from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useBranchFilter } from "@/context/BranchFilterContext";

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
        const interval = setInterval(loadData, 15000); // 15s polling
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
            className={`px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors group select-none ${align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'}`}
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
            <div className="flex h-64 items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-slate-200/60 mb-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Live Session Monitoring</h1>
                    <div className="flex items-center flex-wrap gap-2 text-sm text-slate-500 mt-2">
                        <span>Monitor all active sessions across all branches in real-time.</span>
                        <span className="hidden sm:inline text-slate-300">•</span>
                        <div className="flex items-center gap-2 text-slate-500 font-mono text-[10px] tracking-widest uppercase font-semibold bg-slate-100/50 px-2 py-0.5 rounded-md border border-slate-200/50">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                            </span>
                            Updated just now
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                    <h2 className="font-bold text-slate-900 flex items-center gap-2">
                        <Users size={18} className="text-indigo-600" />
                        Operational Status
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                                <SortHeader field="branch" label="Branch" />
                                <SortHeader field="session_name" label="Session Name" />
                                <SortHeader field="load_status" label="Queue Load" />
                                <SortHeader field="staff_present" label="Staff Present" align="center" />
                                <SortHeader field="status" label="Status" />
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[13px]">
                            {sessions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-16 text-center bg-slate-50/30">
                                        <div className="flex flex-col items-center justify-center space-y-4">
                                            <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm">
                                                <Activity size={28} />
                                            </div>
                                            <div className="space-y-1 max-w-sm">
                                                <h3 className="text-[15px] font-bold text-slate-900">No active sessions</h3>
                                                <p className="text-[13px] text-slate-500 font-medium">All queues are currently clear. When branches start serving customers, they will appear here in real-time.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                sortedSessions.map((s: any) => {
                                    const loadStatus = s.loadStatus;
                                    const idx = s.originalIdx;
                                    
                                    return (
                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-2.5">
                                                <div className="font-semibold text-slate-900">{s.branch}</div>
                                            </td>
                                            <td className="px-4 py-2.5 font-medium text-slate-700">{s.session_name}</td>
                                            <td className="px-4 py-2.5">
                                                {(() => {
                                                    const isCritical = s.loadPercentage >= 90;
                                                    const isHeavy = s.loadPercentage >= 75;
                                                    const barColor = isCritical ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]' :
                                                                     isHeavy ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]' :
                                                                     'bg-indigo-500';
                                                    const textColor = isCritical ? 'text-rose-600' :
                                                                      isHeavy ? 'text-amber-600' :
                                                                      'text-slate-700';
                                                    
                                                    return (
                                                        <div className="flex flex-col gap-1.5 w-32">
                                                            <div className="flex items-end justify-between">
                                                                <span className={`text-xs font-semibold ${textColor}`}>
                                                                    {s.loadPercentage}%
                                                                </span>
                                                                {s.loadStatus !== 'Normal' && (
                                                                    <span className={`text-[9px] font-bold uppercase tracking-widest ${isCritical ? 'text-rose-500 animate-pulse' : 'text-amber-500'}`}>
                                                                        {s.loadStatus}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                                                <div 
                                                                    className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
                                                                    style={{ width: `${s.loadPercentage}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-4 py-2.5 text-center">
                                                {(() => {
                                                    const staffPct = s.staffPresentNum / (s.staffTotalNum || 1);
                                                    const statusColor = staffPct < 0.5 ? 'bg-rose-50 border-rose-200' :
                                                                      staffPct < 1 ? 'bg-amber-50 border-amber-200' :
                                                                      'bg-emerald-50 border-emerald-200';
                                                    const textColor = staffPct < 0.5 ? 'text-rose-700' : staffPct < 1 ? 'text-amber-700' : 'text-emerald-700';

                                                    return (
                                                        <div className={`inline-flex items-baseline justify-center border shadow-sm rounded-md px-2.5 py-1 ${statusColor}`}>
                                                            <span className={`text-[14px] font-extrabold ${textColor}`}>{s.staffPresentNum}</span>
                                                            <span className={`text-[10px] font-bold mx-1 ${textColor} opacity-40`}>/</span>
                                                            <span className={`text-[11px] font-semibold ${textColor} opacity-70`}>{s.staffTotalNum}</span>
                                                        </div>
                                                    );
                                                })()}
                                            </td>

                                            <td className="px-4 py-2.5">
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                                                    s.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-700 border border-slate-200'
                                                }`}>
                                                    {s.status === 'Active' && (
                                                        <span className="relative flex h-1.5 w-1.5">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                                        </span>
                                                    )}
                                                    {s.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                                <a
                                                    href={`/${s.branch_slug || s.branch?.toLowerCase().replace(/\s+/g, '-')}/dashboard/sessions`}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm group"
                                                >
                                                    Dashboard
                                                    <ChevronRight size={14} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
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
