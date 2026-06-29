"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Users, MonitorPlay, Ticket, Activity } from "lucide-react";

export default function BranchExecutiveSummary({ branchId }: { branchId: string }) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getBranchSummary(branchId).then(setData).finally(() => setLoading(false));
    }, [branchId]);

    if (loading) return <div className="h-32 bg-slate-100 animate-pulse rounded-xl"></div>;
    if (!data) return null;

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm shadow-slate-200/50 overflow-hidden flex flex-col sm:flex-row sm:divide-x divide-slate-100">
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center sm:hover:bg-slate-50/50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3"><Users size={20} strokeWidth={1.5} /></div>
                <div className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">{data.total_staff.toLocaleString()}</div>
                <div className="text-sm text-slate-500 font-medium mt-1">Total Staff</div>
            </div>
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center sm:hover:bg-slate-50/50 transition-colors border-t sm:border-t-0 border-slate-100">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3"><MonitorPlay size={20} strokeWidth={1.5} /></div>
                <div className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">{data.active_sessions.toLocaleString()}</div>
                <div className="text-sm text-slate-500 font-medium mt-1">Active Sessions</div>
            </div>
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center sm:hover:bg-slate-50/50 transition-colors border-t sm:border-t-0 border-slate-100">
                <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-3"><Ticket size={20} strokeWidth={1.5} /></div>
                <div className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">{data.active_queues.toLocaleString()}</div>
                <div className="text-sm text-slate-500 font-medium mt-1">Active Queues</div>
            </div>
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center sm:hover:bg-slate-50/50 transition-colors border-t sm:border-t-0 border-slate-100">
                <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mb-3"><Activity size={20} strokeWidth={1.5} /></div>
                <div className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">{data.customers_served_today.toLocaleString()}</div>
                <div className="text-sm text-slate-500 font-medium mt-1">Served Today</div>
            </div>
        </div>
    );
}
