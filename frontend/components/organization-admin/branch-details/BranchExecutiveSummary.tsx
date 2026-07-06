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

    if (loading) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col justify-between h-32 animate-pulse">
                        <div className="flex justify-between items-start w-full">
                            <div className="w-24 h-4 bg-slate-100 rounded-md"></div>
                            <div className="w-8 h-8 rounded-lg bg-slate-100"></div>
                        </div>
                        <div className="w-16 h-8 bg-slate-100 rounded-md mt-auto"></div>
                    </div>
                ))}
            </div>
        );
    }
    if (!data) return null;

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2 sm:mb-3">
                    <div className="text-xs sm:text-[13px] font-medium text-slate-500">Total Staff</div>
                    <Users size={16} strokeWidth={2} className="text-slate-400 hidden sm:block" />
                </div>
                <div className="text-2xl sm:text-3xl font-semibold tracking-tighter text-slate-900 tabular-nums leading-none">{data.total_staff.toLocaleString()}</div>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2 sm:mb-3">
                    <div className="text-xs sm:text-[13px] font-medium text-slate-500">Active Sessions</div>
                    <MonitorPlay size={16} strokeWidth={2} className="text-slate-400 hidden sm:block" />
                </div>
                <div className="text-2xl sm:text-3xl font-semibold tracking-tighter text-slate-900 tabular-nums leading-none">{data.active_sessions.toLocaleString()}</div>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2 sm:mb-3">
                    <div className="text-xs sm:text-[13px] font-medium text-slate-500">Active Queues</div>
                    <Ticket size={16} strokeWidth={2} className="text-slate-400 hidden sm:block" />
                </div>
                <div className="text-2xl sm:text-3xl font-semibold tracking-tighter text-slate-900 tabular-nums leading-none">{data.active_queues.toLocaleString()}</div>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-2 sm:mb-3">
                    <div className="text-xs sm:text-[13px] font-medium text-slate-500">Served Today</div>
                    <Activity size={16} strokeWidth={2} className="text-slate-400 hidden sm:block" />
                </div>
                <div className="text-2xl sm:text-3xl font-semibold tracking-tighter text-slate-900 tabular-nums leading-none">{data.customers_served_today.toLocaleString()}</div>
            </div>
        </div>
    );
}
