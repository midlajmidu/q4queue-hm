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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2"><Users size={20} /></div>
                <div className="text-2xl font-bold text-slate-900">{data.total_staff}</div>
                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mt-1">Total Staff</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2"><MonitorPlay size={20} /></div>
                <div className="text-2xl font-bold text-slate-900">{data.active_sessions}</div>
                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mt-1">Active Sessions</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-2"><Ticket size={20} /></div>
                <div className="text-2xl font-bold text-slate-900">{data.active_queues}</div>
                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mt-1">Active Queues</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center mb-2"><Activity size={20} /></div>
                <div className="text-2xl font-bold text-slate-900">{data.customers_served_today}</div>
                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mt-1">Served Today</div>
            </div>
        </div>
    );
}
