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
        <div className="bg-white rounded-xl border border-slate-200 flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Activity size={16} strokeWidth={2} className="text-slate-400" />
                    <h3 className="font-semibold text-slate-900 text-sm">System Health</h3>
                </div>
                {/* Overall status dot */}
                <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${
                        data.queue_health === 'Healthy' && data.staff_availability === 'Optimal'
                            ? 'bg-emerald-500' 
                            : 'bg-amber-500'
                    }`}></span>
                    <span className="text-xs font-medium text-slate-600">
                        {data.queue_health === 'Healthy' && data.staff_availability === 'Optimal' ? 'Operational' : 'Degraded'}
                    </span>
                </div>
            </div>
            <div className="p-5 flex flex-col justify-center space-y-4">
                <div className="flex justify-between items-center">
                    <span className="text-[13px] font-medium text-slate-500">Queues</span>
                    <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-slate-900">{data.queue_health}</span>
                        <span className={`w-2 h-2 rounded-full ${
                            data.queue_health === 'Healthy' 
                                ? 'bg-emerald-500'
                                : data.queue_health === 'Degraded' ? 'bg-amber-500' : 'bg-red-500'
                        }`}></span>
                    </div>
                </div>
                
                <div className="flex justify-between items-center">
                    <span className="text-[13px] font-medium text-slate-500">Staff Availability</span>
                    <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-slate-900">{data.staff_availability}</span>
                        <span className={`w-2 h-2 rounded-full ${
                            data.staff_availability === 'Optimal' 
                                ? 'bg-emerald-500'
                                : data.staff_availability === 'Low' ? 'bg-amber-500' : 'bg-red-500'
                        }`}></span>
                    </div>
                </div>
            </div>
        </div>
    );
}
