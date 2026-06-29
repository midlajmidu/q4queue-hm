"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export default function BranchQueueBreakdown({ branchId }: { branchId: string }) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getBranchQueuesOverview(branchId).then(setData).finally(() => setLoading(false));
    }, [branchId]);

    if (loading) return <div className="h-40 bg-slate-100 animate-pulse rounded-2xl"></div>;

    return (
        <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/50 border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className="font-semibold text-lg tracking-tight text-slate-900">Queue Breakdown</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/50 border-b border-slate-100/70 text-slate-500 font-medium">
                        <tr>
                            <th className="px-5 py-3.5 font-medium">Queue Name</th>
                            <th className="px-5 py-3.5 text-center font-medium">Status</th>
                            <th className="px-5 py-3.5 text-center font-medium">Current</th>
                            <th className="px-5 py-3.5 text-center font-medium">Waiting</th>
                            <th className="px-5 py-3.5 text-center font-medium">Completed</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/70">
                        {data.map((q, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-5 py-3.5 font-medium text-slate-900">{q.queue_name}</td>
                                <td className="px-5 py-3.5 text-center"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[11px] font-semibold tracking-wider uppercase">{q.status}</span></td>
                                <td className="px-5 py-3.5 text-center text-slate-600 font-medium tabular-nums">{q.current_token || '-'}</td>
                                <td className="px-5 py-3.5 text-center text-slate-600 tabular-nums">{q.waiting_count}</td>
                                <td className="px-5 py-3.5 text-center text-slate-600 tabular-nums">{q.completed_today}</td>
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-10 text-center">
                                    <div className="flex flex-col items-center justify-center text-slate-400">
                                        <svg className="w-12 h-12 mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                        </svg>
                                        <p className="text-sm font-medium text-slate-500">No active queues at the moment</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
