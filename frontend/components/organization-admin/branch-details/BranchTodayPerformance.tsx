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
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                <div className="p-4 sm:p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={14} strokeWidth={2} className="text-slate-400" />
                        <span className="text-xs sm:text-[13px] font-medium text-slate-500">Avg Wait Time</span>
                    </div>
                    <div className="flex items-end gap-1.5">
                        <span className="text-2xl font-semibold tracking-tight text-slate-900 leading-none">{data.avg_wait_time_mins}</span>
                        <span className="text-xs font-medium text-slate-500 mb-0.5">mins</span>
                    </div>
                </div>
                
                <div className="p-4 sm:p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock size={14} strokeWidth={2} className="text-slate-400" />
                        <span className="text-xs sm:text-[13px] font-medium text-slate-500">Avg Service Time</span>
                    </div>
                    <div className="flex items-end gap-1.5">
                        <span className="text-2xl font-semibold tracking-tight text-slate-900 leading-none">{data.avg_service_time_mins}</span>
                        <span className="text-xs font-medium text-slate-500 mb-0.5">mins</span>
                    </div>
                </div>
                
                <div className="p-4 sm:p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertCircle size={14} strokeWidth={2} className="text-slate-400" />
                        <span className="text-xs sm:text-[13px] font-medium text-slate-500">Drop-off Rate</span>
                    </div>
                    <div className="flex items-end gap-1.5">
                        <span className="text-2xl font-semibold tracking-tight text-slate-900 leading-none">{data.drop_off_rate}%</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
