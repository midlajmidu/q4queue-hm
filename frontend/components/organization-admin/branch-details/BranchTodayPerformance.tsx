"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export default function BranchTodayPerformance({ branchId }: { branchId: string }) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getBranchPerformance(branchId).then(setData).finally(() => setLoading(false));
    }, [branchId]);

    if (loading) return <div className="h-32 bg-slate-100 animate-pulse rounded-xl"></div>;
    if (!data) return null;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 font-semibold text-slate-900">Today's Performance</div>
            <div className="grid grid-cols-2 md:grid-cols-3 divide-x divide-y divide-slate-100">
                <div className="p-4">
                    <div className="text-sm text-slate-500">Customers Served</div>
                    <div className="text-xl font-semibold mt-1">{data.customers_served_today}</div>
                </div>
                <div className="p-4">
                    <div className="text-sm text-slate-500">Customers Waiting</div>
                    <div className="text-xl font-semibold mt-1">{data.customers_waiting}</div>
                </div>
                <div className="p-4">
                    <div className="text-sm text-slate-500">Average Wait Time</div>
                    <div className="text-xl font-semibold mt-1">{data.average_wait_time}</div>
                </div>
                <div className="p-4 border-t border-slate-100">
                    <div className="text-sm text-slate-500">Average Service Time</div>
                    <div className="text-xl font-semibold mt-1">{data.average_service_time}</div>
                </div>
                <div className="p-4 border-t border-slate-100">
                    <div className="text-sm text-slate-500">Cancelled Tokens</div>
                    <div className="text-xl font-semibold mt-1 text-red-600">{data.cancelled_tokens}</div>
                </div>
                <div className="p-4 border-t border-slate-100">
                    <div className="text-sm text-slate-500">Completion Rate</div>
                    <div className="text-xl font-semibold mt-1 text-green-600">{data.completion_rate}</div>
                </div>
            </div>
        </div>
    );
}
