"use client";
import { TrendingUp, Clock, AlertCircle, CheckCircle2, Activity } from "lucide-react";

export default function BranchTodayPerformance({ data, periodLabel }: { data: any; periodLabel?: string }) {
    if (!data) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden animate-pulse">
                <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg"></div>
                    <div className="w-48 h-5 bg-slate-100 rounded"></div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-0">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="p-6 border-r border-slate-100 last:border-0">
                            <div className="w-24 h-4 bg-slate-100 rounded mb-4"></div>
                            <div className="w-16 h-8 bg-slate-100 rounded"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    const isLive = !periodLabel || periodLabel.toLowerCase().includes("live") || periodLabel.toLowerCase().includes("today");
    const avgWait = data.average_wait_time || (data.avg_wait_time_mins ? `${data.avg_wait_time_mins}m` : "0m");
    const avgService = data.average_service_time || (data.avg_service_time_mins ? `${data.avg_service_time_mins}m` : "0m");
    const skipRate = data.skip_rate || (data.drop_off_rate !== undefined ? `${data.drop_off_rate}%` : "0%");
    const completionRate = data.completion_rate || "0%";
    const servedCount = data.customers_served ?? data.customers_served_today ?? 0;
    const skippedCount = data.customers_skipped ?? data.cancelled_tokens ?? 0;

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-white rounded-md text-indigo-600 border border-slate-200 shadow-xs">
                        <Activity size={16} strokeWidth={2.5} />
                    </div>
                    <h2 className="font-bold text-slate-800 text-[13px] uppercase tracking-wider">Performance Overview</h2>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1 bg-white rounded-lg border border-slate-200 shadow-xs">
                    {isLive && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>}
                    <span className="text-[11px] font-bold text-slate-700 tracking-wide">
                        {periodLabel || "Live"}
                    </span>
                </div>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                {/* Metric 1: Avg Wait Time */}
                <div className="p-5 flex flex-col justify-between group bg-white hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingUp size={15} strokeWidth={2.5} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Avg Wait Time</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums leading-none">
                            {avgWait}
                        </span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-400 mt-2">Registration to call</span>
                </div>
                
                {/* Metric 2: Avg Service Time */}
                <div className="p-5 flex flex-col justify-between group bg-white hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-2 mb-3">
                        <Clock size={15} strokeWidth={2.5} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Avg Service Time</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums leading-none">
                            {avgService}
                        </span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-400 mt-2">Call to completion</span>
                </div>
                
                {/* Metric 3: Completion Rate */}
                <div className="p-5 flex flex-col justify-between group bg-white hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 size={15} strokeWidth={2.5} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Completion Rate</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-extrabold tracking-tight text-emerald-600 tabular-nums leading-none">
                            {completionRate}
                        </span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-400 mt-2">{servedCount} tickets served</span>
                </div>

                {/* Metric 4: Skip / Drop-off Rate */}
                <div className="p-5 flex flex-col justify-between group bg-white hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertCircle size={15} strokeWidth={2.5} className="text-slate-400 group-hover:text-rose-600 transition-colors" />
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Drop-off Rate</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-extrabold tracking-tight text-rose-600 tabular-nums leading-none">
                            {skipRate}
                        </span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-400 mt-2">{skippedCount} tickets skipped</span>
                </div>
            </div>
        </div>
    );
}
