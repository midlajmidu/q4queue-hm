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
        <div className="bg-white rounded-[20px] border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100/80 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="bg-slate-100 p-1.5 rounded-lg text-slate-500">
                        <Activity size={14} strokeWidth={2.5} />
                    </div>
                    <h3 className="font-semibold text-slate-800 text-[13px] uppercase tracking-wider">System Health</h3>
                </div>
                <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-md border border-slate-200/80 shadow-sm">
                    <span className={`relative flex h-2 w-2`}>
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                            data.queue_health === 'Healthy' && data.staff_availability === 'Optimal' ? 'bg-emerald-400' : 'bg-amber-400'
                        }`}></span>
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${
                            data.queue_health === 'Healthy' && data.staff_availability === 'Optimal' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}></span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                        {data.queue_health === 'Healthy' && data.staff_availability === 'Optimal' ? 'Operational' : 'Degraded'}
                    </span>
                </div>
            </div>
            <div className="p-5 flex flex-col justify-center space-y-5">
                <div className="flex justify-between items-center group">
                    <span className="text-[13px] font-medium text-slate-500 group-hover:text-slate-800 transition-colors">Queues</span>
                    <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold tracking-tight text-slate-900">{data.queue_health}</span>
                        <span className={`w-2 h-2 rounded-full shadow-sm ${
                            data.queue_health === 'Healthy' 
                                ? 'bg-emerald-500 shadow-emerald-200'
                                : data.queue_health === 'Degraded' ? 'bg-amber-500 shadow-amber-200' : 'bg-rose-500 shadow-rose-200'
                        }`}></span>
                    </div>
                </div>
                
                <div className="flex justify-between items-center group">
                    <span className="text-[13px] font-medium text-slate-500 group-hover:text-slate-800 transition-colors">Staff Availability</span>
                    <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold tracking-tight text-slate-900">{data.staff_availability}</span>
                        <span className={`w-2 h-2 rounded-full shadow-sm ${
                            data.staff_availability === 'Optimal' 
                                ? 'bg-emerald-500 shadow-emerald-200'
                                : data.staff_availability === 'Low' ? 'bg-amber-500 shadow-amber-200' : 'bg-rose-500 shadow-rose-200'
                        }`}></span>
                    </div>
                </div>
            </div>
        </div>
    );
}
