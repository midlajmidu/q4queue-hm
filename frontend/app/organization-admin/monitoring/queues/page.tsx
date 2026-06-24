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
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Live Queue Monitoring</h1>
                <p className="text-sm text-slate-500 mt-1">Monitor all active queues across all branches in real-time.</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                    <h2 className="font-bold text-slate-900 flex items-center gap-2">
                        <ListFilter size={18} className="text-indigo-600" />
                        Active Queues
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                                <th className="p-4">Branch</th>
                                <th className="p-4">Queue Name</th>
                                <th className="p-4 text-center">Waiting</th>
                                <th className="p-4 text-center">Served Today</th>
                                <th className="p-4 text-center">Avg Wait Time</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {queues.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-slate-500">
                                        No queues currently available.
                                    </td>
                                </tr>
                            ) : (
                                queues.map((q: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="p-4">
                                            <div className="font-medium text-slate-900">{q.branch}</div>
                                        </td>
                                        <td className="p-4 font-medium text-slate-700">{q.queue_name}</td>
                                        <td className="p-4 text-center font-medium text-slate-700">{q.waiting}</td>
                                        <td className="p-4 text-center font-medium text-slate-700">{q.served_today}</td>
                                        <td className="p-4 text-center text-slate-500">{q.avg_wait_time}</td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                q.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
                                            }`}>
                                                {q.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <a
                                                href={`/${q.branch_slug}/dashboard`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                                            >
                                                <ExternalLink size={14} />
                                                Dashboard
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
