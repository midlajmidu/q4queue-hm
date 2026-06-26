"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { ListFilter, ExternalLink } from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useBranchFilter } from "@/context/BranchFilterContext";

export default function QueuesMonitoringPage() {
    const [queues, setQueues] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const { selectedBranchId } = useBranchFilter();

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
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-slate-200/60 mb-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Live Queue Monitoring</h1>
                    <div className="flex items-center flex-wrap gap-2 text-sm text-slate-500 mt-2">
                        <span>Monitor all active queues across all branches in real-time.</span>
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
                        <ListFilter size={18} className="text-indigo-600" />
                        Customer Flow
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                                <th className="px-4 py-3">Branch</th>
                                <th className="px-4 py-3">Queue Name</th>
                                <th className="px-4 py-3 text-right">Waiting</th>
                                <th className="px-4 py-3 text-right">Served Today</th>
                                <th className="px-4 py-3 text-right">Avg Wait Time</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[13px]">
                            {queues.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-slate-500">
                                        No queues currently available.
                                    </td>
                                </tr>
                            ) : (
                                queues.map((q: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-2.5">
                                            <div className="font-semibold text-slate-900">{q.branch}</div>
                                        </td>
                                        <td className="px-4 py-2.5 font-medium text-slate-700">{q.queue_name}</td>
                                        <td className="px-4 py-2.5 text-right font-medium text-slate-700">{q.waiting || 0}</td>
                                        <td className="px-4 py-2.5 text-right font-medium text-slate-700">{q.served_today || 0}</td>
                                        <td className="px-4 py-2.5 text-right text-slate-500">{q.avg_wait_time || "0m"}</td>
                                        <td className="px-4 py-2.5">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                                                q.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-700 border border-slate-200'
                                            }`}>
                                                {q.status === 'Active' && (
                                                    <span className="relative flex h-1.5 w-1.5">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                                    </span>
                                                )}
                                                {q.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                            <a
                                                href={`/${q.branch_slug}/dashboard/queues`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                                            >
                                                <ExternalLink size={14} />
                                                Queues
                                            </a>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
