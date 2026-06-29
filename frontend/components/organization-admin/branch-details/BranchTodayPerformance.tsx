"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export default function BranchTodayPerformance({ branchId }: { branchId: string }) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getBranchPerformance(branchId).then(setData).finally(() => setLoading(false));
    }, [branchId]);

    if (loading) return <div className="h-32 bg-slate-100 animate-pulse rounded-2xl"></div>;
    if (!data) return null;

    return (
        <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/50 border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h2.672c.677 0 1.258-.456 1.45-1.096l1.378-4.595a1.5 1.5 0 012.895 0l2.605 8.685a1.5 1.5 0 002.895 0L18.328 11H21" />
                </svg>
                <span className="font-semibold text-lg tracking-tight text-slate-900">Today's Performance</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 divide-x divide-y divide-slate-100/70">
                <div className="p-6 transition-colors hover:bg-slate-50/50">
                    <div className="text-sm font-medium text-slate-500">Customers Served</div>
                    <div className="text-2xl font-bold tracking-tight mt-1 text-slate-900 tabular-nums">{data.customers_served_today}</div>
                </div>
                <div className="p-6 transition-colors hover:bg-slate-50/50">
                    <div className="text-sm font-medium text-slate-500">Customers Waiting</div>
                    <div className="text-2xl font-bold tracking-tight mt-1 text-slate-900 tabular-nums">{data.customers_waiting}</div>
                </div>
                <div className="p-6 transition-colors hover:bg-slate-50/50">
                    <div className="text-sm font-medium text-slate-500">Avg Wait Time</div>
                    <div className="text-2xl font-bold tracking-tight mt-1 text-slate-900 tabular-nums">{data.average_wait_time}</div>
                </div>
                <div className="p-6 border-t border-slate-100/70 transition-colors hover:bg-slate-50/50">
                    <div className="text-sm font-medium text-slate-500">Avg Service Time</div>
                    <div className="text-2xl font-bold tracking-tight mt-1 text-slate-900 tabular-nums">{data.average_service_time}</div>
                </div>
                <div className="p-6 border-t border-slate-100/70 transition-colors hover:bg-slate-50/50">
                    <div className="text-sm font-medium text-slate-500">Cancelled Tokens</div>
                    <div className="text-2xl font-bold tracking-tight mt-1 text-red-600 tabular-nums">{data.cancelled_tokens}</div>
                </div>
                <div className="p-6 border-t border-slate-100/70 transition-colors hover:bg-slate-50/50">
                    <div className="text-sm font-medium text-slate-500">Completion Rate</div>
                    <div className="text-2xl font-bold tracking-tight mt-1 text-emerald-600 tabular-nums">{data.completion_rate}</div>
                </div>
            </div>
        </div>
    );
}
