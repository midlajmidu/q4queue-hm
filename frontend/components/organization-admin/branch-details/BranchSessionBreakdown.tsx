"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { MonitorPlay } from "lucide-react";

export default function BranchSessionBreakdown({ branchId }: { branchId: string }) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getBranchSessionsOverview(branchId).then(setData).finally(() => setLoading(false));
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
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <MonitorPlay size={16} strokeWidth={2} className="text-slate-400" />
                    <h3 className="font-semibold text-slate-900 text-sm">Session Breakdown</h3>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                        <tr>
                            <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider">Session</th>
                            <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider">Operator</th>
                            <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-center">Status</th>
                            <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-center">Served</th>
                            <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-center">Avg Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.map((s, i) => (
                            <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                                <td className="px-5 py-3 text-sm font-medium text-slate-900 flex items-center gap-2">
                                    {s.session_name}
                                </td>
                                <td className="px-5 py-3 text-sm text-slate-600">{s.operator_name}</td>
                                <td className="px-5 py-3 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                        <span className={`w-2 h-2 rounded-full ${s.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                        <span className="text-xs font-medium text-slate-600">{s.status}</span>
                                    </div>
                                </td>
                                <td className="px-5 py-3 text-center text-sm font-medium text-slate-900 tabular-nums">{s.customers_served}</td>
                                <td className="px-5 py-3 text-center text-sm text-slate-500 tabular-nums">{s.average_service_time}</td>
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-10">
                                    <div className="flex flex-col items-center justify-center text-center">
                                        <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
                                            <MonitorPlay size={16} strokeWidth={2} className="text-slate-400" />
                                        </div>
                                        <p className="text-sm font-medium text-slate-900 mb-0.5">No active sessions</p>
                                        <p className="text-xs text-slate-500">Operators have not started any sessions.</p>
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
