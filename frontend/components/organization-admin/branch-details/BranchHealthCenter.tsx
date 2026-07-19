"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Activity } from "lucide-react";

export default function BranchHealthCenter({ branchId }: { branchId: string }) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getBranchHealth(branchId).then(setData).finally(() => setLoading(false));
    }, [branchId]);

    if (loading) return <div className="h-40 bg-slate-100 animate-pulse rounded-2xl"></div>;
    if (!data) return null;

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-6 flex flex-col justify-between group hover:border-slate-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all">
            <div className="flex justify-between items-start mb-6">
                <div className="text-sm font-medium text-slate-500">System Health</div>
                <div className="p-2 bg-slate-50 rounded-md text-slate-400 border border-slate-100 group-hover:bg-slate-100 group-hover:text-slate-600 transition-colors">
                    <Activity size={16} strokeWidth={2} />
                </div>
            </div>
            
            <div className="flex flex-col gap-4 mt-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-[13px] text-slate-500 font-medium">
                        <span className="relative flex h-2 w-2">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                                data.queue_health === 'Healthy' && data.staff_availability === 'Optimal' ? 'bg-emerald-400' : 'bg-amber-400'
                            }`}></span>
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${
                                data.queue_health === 'Healthy' && data.staff_availability === 'Optimal' ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}></span>
                        </span>
                        Overall Status
                    </div>
                    <span className="text-[13px] font-semibold text-slate-900">
                        {data.queue_health === 'Healthy' && data.staff_availability === 'Optimal' ? 'Operational' : 'Degraded'}
                    </span>
                </div>
                
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-[13px] text-slate-500 font-medium">
                        <span className={`w-2 h-2 rounded-full ${
                            data.queue_health === 'Healthy' ? 'bg-emerald-500' : data.queue_health === 'Degraded' ? 'bg-amber-500' : 'bg-rose-500'
                        }`}></span>
                        Queues
                    </div>
                    <span className="text-[13px] font-semibold text-slate-900">{data.queue_health}</span>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 text-[13px] text-slate-500 font-medium">
                        <span className={`w-2 h-2 rounded-full ${
                            data.staff_availability === 'Optimal' ? 'bg-emerald-500' : data.staff_availability === 'Low' ? 'bg-amber-500' : 'bg-rose-500'
                        }`}></span>
                        Staff Availability
                    </div>
                    <span className="text-[13px] font-semibold text-slate-900">{data.staff_availability}</span>
                </div>
            </div>
        </div>
    );
}
