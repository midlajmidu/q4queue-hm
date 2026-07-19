"use client";
import { useState, useEffect } from "react";
import { TrendingUp, Clock, AlertCircle, Activity } from "lucide-react";
import { api } from "@/lib/api";

export default function BranchTodayPerformance({ data }: { data: any }) {
    if (!data) {
        return (
            <div className="bg-white rounded-[24px] shadow-sm border border-slate-200/60 overflow-hidden animate-pulse">
                <div className="p-6 border-b border-slate-100/80 flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-xl"></div>
                    <div className="w-48 h-5 bg-slate-100 rounded"></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-0">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="p-6 border-r border-slate-100/80 last:border-0">
                            <div className="w-24 h-4 bg-slate-100 rounded mb-6"></div>
                            <div className="w-16 h-10 bg-slate-100 rounded"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-md text-slate-400 border border-slate-200 shadow-sm">
                        <Activity size={16} strokeWidth={2} />
                    </div>
                    <h2 className="font-semibold text-slate-800 text-[13px] uppercase tracking-widest mt-0.5">Today's Performance</h2>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-md border border-slate-200 shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest mt-px">Live</span>
                </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
                {/* Metric 1 */}
                <div className="p-6 flex flex-col justify-center group bg-white hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-2.5 cursor-help w-max" title="Average duration customers wait before being served">
                            <TrendingUp size={16} strokeWidth={2} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                            <span className="text-[12px] font-medium text-slate-500 uppercase tracking-widest">Avg Wait Time</span>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-4xl font-semibold tracking-tight text-slate-900 leading-none tabular-nums">{data.avg_wait_time_mins || '0'}</span>
                        <span className="text-sm font-medium text-slate-400 uppercase tracking-widest mb-1">min</span>
                    </div>
                </div>
                
                {/* Metric 2 */}
                <div className="p-6 flex flex-col justify-center group bg-white hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-2.5 cursor-help w-max" title="Average time staff spends serving each customer">
                            <Clock size={16} strokeWidth={2} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                            <span className="text-[12px] font-medium text-slate-500 uppercase tracking-widest">Avg Service Time</span>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-4xl font-semibold tracking-tight text-slate-900 leading-none tabular-nums">{data.avg_service_time_mins || '0'}</span>
                        <span className="text-sm font-medium text-slate-400 uppercase tracking-widest mb-1">min</span>
                    </div>
                </div>
                
                {/* Metric 3 */}
                <div className="p-6 flex flex-col justify-center group bg-white hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-2.5 cursor-help w-max" title="Percentage of customers who dropped off without being served">
                            <AlertCircle size={16} strokeWidth={2} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                            <span className="text-[12px] font-medium text-slate-500 uppercase tracking-widest">Drop-off Rate</span>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-4xl font-semibold tracking-tight text-slate-900 leading-none tabular-nums">{data.drop_off_rate || '0'}</span>
                        <span className="text-sm font-medium text-slate-400 uppercase tracking-widest mb-1">%</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
