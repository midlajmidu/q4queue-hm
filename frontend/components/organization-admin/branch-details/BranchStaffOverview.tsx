"use client";
import { useState, useEffect } from "react";
import { Users } from "lucide-react";
import { api } from "@/lib/api";

export default function BranchStaffOverview({ data }: { data: any[] }) {
    if (!data) return <div className="h-40 bg-slate-100 animate-pulse rounded-2xl"></div>;

    return (
        <div className="bg-white rounded-[20px] border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100/80 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users size={16} strokeWidth={2} className="text-slate-400" />
                    <h3 className="font-semibold text-slate-900 text-sm">Staff Overview</h3>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                        <tr>
                            <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider">Name</th>
                            <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-center">Status</th>
                            <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-center">Sessions</th>
                            <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-center">Served Today</th>
                            <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider">Last Login</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.map((s, i) => (
                            <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                                <td className="px-5 py-3 text-sm font-medium text-slate-900">{s.name}</td>
                                <td className="px-5 py-3 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                        <span className={`w-2 h-2 rounded-full ${s.status === 'Online' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                        <span className="text-xs font-medium text-slate-600">{s.status}</span>
                                    </div>
                                </td>
                                <td className="px-5 py-3 text-center text-sm text-slate-600 tabular-nums">{s.sessions_managed}</td>
                                <td className="px-5 py-3 text-center text-sm text-slate-600 tabular-nums">{s.customers_served_today}</td>
                                <td className="px-5 py-3 text-slate-500 text-xs">
                                    {s.last_login && s.last_login !== 'Never' 
                                        ? new Date(s.last_login).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) 
                                        : 'Never'}
                                </td>
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-10">
                                    <div className="flex flex-col items-center justify-center text-center">
                                        <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
                                            <Users size={16} strokeWidth={2} className="text-slate-400" />
                                        </div>
                                        <p className="text-sm font-medium text-slate-900 mb-0.5">No staff members found</p>
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
