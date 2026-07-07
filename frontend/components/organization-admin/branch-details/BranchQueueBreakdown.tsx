"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { List } from "lucide-react";

export default function BranchQueueBreakdown({ branchId }: { branchId: string }) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getBranchQueuesOverview(branchId).then(setData).finally(() => setLoading(false));
    }, [branchId]);

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-pulse">
                <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                    <div className="w-5 h-5 bg-slate-200 rounded"></div>
                    <div className="w-32 h-5 bg-slate-200 rounded"></div>
                </div>
                <div className="p-5 space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex justify-between items-center">
                            <div className="w-1/4 h-4 bg-slate-100 rounded"></div>
                            <div className="w-1/4 h-4 bg-slate-100 rounded"></div>
                            <div className="w-1/4 h-4 bg-slate-100 rounded"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-[20px] border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100/80 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="bg-slate-100 p-1.5 rounded-lg text-slate-500">
                        <List size={14} strokeWidth={2.5} />
                    </div>
                    <h3 className="font-semibold text-slate-800 text-[13px] uppercase tracking-wider">Queue Breakdown</h3>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-400">
                        <tr>
                            <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">Queue Name</th>
                            <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-center whitespace-nowrap">Status</th>
                            <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-center whitespace-nowrap">Current</th>
                            <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-center whitespace-nowrap">Waiting</th>
                            <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-center whitespace-nowrap">Completed</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.map((q, i) => (
                            <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                                <td className="px-5 py-3.5 text-[13px] font-semibold text-slate-900 whitespace-nowrap">
                                    {q.queue_name}
                                </td>
                                <td className="px-5 py-3.5 text-center whitespace-nowrap">
                                    <div className="flex items-center justify-center gap-1.5">
                                        <span className={`w-2 h-2 rounded-full shadow-sm ${q.status === 'Active' ? 'bg-emerald-500 shadow-emerald-200 animate-pulse' : 'bg-slate-400'}`}></span>
                                        <span className="text-[11px] font-bold tracking-wide uppercase text-slate-600">{q.status}</span>
                                    </div>
                                </td>
                                <td className="px-5 py-3.5 text-center text-[13px] font-bold text-slate-900 tabular-nums whitespace-nowrap">{q.current_token || '-'}</td>
                                <td className="px-5 py-3.5 text-center text-[13px] font-semibold text-slate-500 tabular-nums whitespace-nowrap">{q.waiting_count}</td>
                                <td className="px-5 py-3.5 text-center text-[13px] font-semibold text-slate-500 tabular-nums whitespace-nowrap">{q.completed_today}</td>
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-12">
                                    <div className="flex flex-col items-center justify-center text-center">
                                        <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-4">
                                            <List size={18} strokeWidth={2} className="text-slate-400" />
                                        </div>
                                        <p className="text-[13px] font-semibold text-slate-900 mb-1">No active queues</p>
                                        <p className="text-[12px] text-slate-500 max-w-[200px]">There are no queues running right now.</p>
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
