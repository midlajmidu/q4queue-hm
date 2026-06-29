"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export default function BranchHealthCenter({ branchId }: { branchId: string }) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getBranchHealth(branchId).then(setData).finally(() => setLoading(false));
    }, [branchId]);

    if (loading) return <div className="h-40 bg-slate-100 animate-pulse rounded-2xl"></div>;
    if (!data) return null;

    return (
        <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/50 border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span className="font-semibold text-lg tracking-tight text-slate-900">Branch Health</span>
                </div>
                <span className={`px-2.5 py-1 text-[11px] font-semibold tracking-wider uppercase rounded-md ${data.status === 'Healthy' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    Score: {data.health_score}/100
                </span>
            </div>
            <div className="p-5 flex flex-col space-y-4 text-sm">
                <div className="flex justify-between items-center"><span className="text-slate-500 font-medium">Queues:</span> <span className="font-semibold text-slate-900">{data.queue_health}</span></div>
                <div className="flex justify-between items-center"><span className="text-slate-500 font-medium">Sessions:</span> <span className="font-semibold text-slate-900">{data.session_health}</span></div>
                <div className="flex justify-between items-center"><span className="text-slate-500 font-medium">Staff:</span> <span className="font-semibold text-slate-900">{data.staff_availability}</span></div>
            </div>
        </div>
    );
}
