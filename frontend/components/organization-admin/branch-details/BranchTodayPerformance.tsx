"use client";
import { useState, useEffect } from "react";
import { TrendingUp, Clock, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

export default function BranchTodayPerformance({ branchId }: { branchId: string }) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getBranchPerformance(branchId).then(setData).finally(() => setLoading(false));
    }, [branchId]);

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-pulse">
                <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                    <div className="w-5 h-5 bg-slate-200 rounded"></div>
                    <div className="w-40 h-5 bg-slate-200 rounded"></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-[1px] bg-slate-100/70">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="p-6 bg-white">
                            <div className="w-24 h-4 bg-slate-100 rounded mb-2"></div>
                            <div className="w-16 h-8 bg-slate-200 rounded"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    if (!data) return null;

    return (
        <div className="bg-white rounded-[20px] border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100/80 bg-slate-50/50 flex items-center justify-between">
                <h2 className="font-semibold text-slate-800 text-[13px] uppercase tracking-wider">Today's Performance</h2>
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Live</span>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100/80">
                <div className="p-5 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-3 cursor-help w-max" title="Average duration customers wait before being served">
                        <TrendingUp size={14} strokeWidth={2.5} className="text-indigo-400" />
                        <span className="text-[12px] font-bold text-slate-500 tracking-wider uppercase border-b border-dashed border-slate-300">Avg Wait Time</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-bold tracking-tight text-slate-900 leading-none">{data.avg_wait_time_mins || '0'}</span>
                        <span className="text-sm font-semibold text-slate-400">min</span>
                    </div>
                </div>
                
                <div className="p-5 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-3 cursor-help w-max" title="Average time staff spends serving each customer">
                        <Clock size={14} strokeWidth={2.5} className="text-emerald-400" />
                        <span className="text-[12px] font-bold text-slate-500 tracking-wider uppercase border-b border-dashed border-slate-300">Avg Service Time</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-bold tracking-tight text-slate-900 leading-none">{data.avg_service_time_mins || '0'}</span>
                        <span className="text-sm font-semibold text-slate-400">min</span>
                    </div>
                </div>
                
                <div className="p-5 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-3 cursor-help w-max" title="Percentage of customers who dropped off without being served">
                        <AlertCircle size={14} strokeWidth={2.5} className="text-rose-400" />
                        <span className="text-[12px] font-bold text-slate-500 tracking-wider uppercase border-b border-dashed border-slate-300">Drop-off Rate</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-bold tracking-tight text-slate-900 leading-none">{data.drop_off_rate || '0'}</span>
                        <span className="text-sm font-semibold text-slate-400">%</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
