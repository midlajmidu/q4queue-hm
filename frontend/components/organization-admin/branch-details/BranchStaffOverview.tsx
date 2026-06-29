"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export default function BranchStaffOverview({ branchId }: { branchId: string }) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getBranchStaffOverview(branchId).then(setData).finally(() => setLoading(false));
    }, [branchId]);

    if (loading) return <div className="h-40 bg-slate-100 animate-pulse rounded-2xl"></div>;

    return (
        <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/50 border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="font-semibold text-lg tracking-tight text-slate-900">Staff Overview</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/50 border-b border-slate-100/70 text-slate-500 font-medium">
                        <tr>
                            <th className="px-5 py-3.5 font-medium">Name</th>
                            <th className="px-5 py-3.5 text-center font-medium">Status</th>
                            <th className="px-5 py-3.5 text-center font-medium">Sessions</th>
                            <th className="px-5 py-3.5 text-center font-medium">Served Today</th>
                            <th className="px-5 py-3.5 font-medium">Last Login</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/70">
                        {data.map((s, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-5 py-3.5 font-medium text-slate-900">{s.name}</td>
                                <td className="px-5 py-3.5 text-center"><span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wider uppercase ${s.status === 'Online' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{s.status}</span></td>
                                <td className="px-5 py-3.5 text-center text-slate-600 tabular-nums">{s.sessions_managed}</td>
                                <td className="px-5 py-3.5 text-center text-slate-600 tabular-nums">{s.customers_served_today}</td>
                                <td className="px-5 py-3.5 text-slate-500 text-xs">
                                    {s.last_login && s.last_login !== 'Never' 
                                        ? new Date(s.last_login).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) 
                                        : 'Never'}
                                </td>
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-10 text-center">
                                    <div className="flex flex-col items-center justify-center text-slate-400">
                                        <svg className="w-12 h-12 mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                        <p className="text-sm font-medium text-slate-500">No staff members found</p>
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
