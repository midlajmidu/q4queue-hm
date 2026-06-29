"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export default function BranchSessionBreakdown({ branchId }: { branchId: string }) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getBranchSessionsOverview(branchId).then(setData).finally(() => setLoading(false));
    }, [branchId]);

    if (loading) return <div className="h-40 bg-slate-100 animate-pulse rounded-2xl"></div>;

    return (
        <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/50 border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold text-lg tracking-tight text-slate-900">Session Breakdown</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/50 border-b border-slate-100/70 text-slate-500 font-medium">
                        <tr>
                            <th className="px-5 py-3.5 font-medium">Session</th>
                            <th className="px-5 py-3.5 font-medium">Operator</th>
                            <th className="px-5 py-3.5 text-center font-medium">Status</th>
                            <th className="px-5 py-3.5 text-center font-medium">Served</th>
                            <th className="px-5 py-3.5 text-center font-medium">Avg Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/70">
                        {data.map((s, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-5 py-3.5 font-medium text-slate-900">{s.session_name}</td>
                                <td className="px-5 py-3.5 text-slate-600 font-medium">{s.operator_name}</td>
                                <td className="px-5 py-3.5 text-center"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[11px] font-semibold tracking-wider uppercase">{s.status}</span></td>
                                <td className="px-5 py-3.5 text-center text-slate-600 tabular-nums">{s.customers_served}</td>
                                <td className="px-5 py-3.5 text-center text-slate-500 tabular-nums">{s.average_service_time}</td>
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-10 text-center">
                                    <div className="flex flex-col items-center justify-center text-slate-400">
                                        <svg className="w-12 h-12 mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p className="text-sm font-medium text-slate-500">No active sessions at the moment</p>
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
