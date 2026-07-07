"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { AlertTriangle } from "lucide-react";

export default function BranchAlerts({ branchId }: { branchId: string }) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getBranchAlerts(branchId).then(setData).finally(() => setLoading(false));
    }, [branchId]);

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                {[1, 2].map(i => (
                    <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 flex gap-4 h-24">
                        <div className="w-6 h-6 rounded bg-slate-100 shrink-0"></div>
                        <div className="w-full">
                            <div className="w-3/4 h-5 bg-slate-100 rounded mb-3"></div>
                            <div className="w-1/2 h-4 bg-slate-100 rounded"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (data.length === 0) {
        return null;
    }

    return (
        <div className="space-y-3">
            {data.map((alert, i) => (
                <div key={i} className="group relative bg-rose-50/50 rounded-xl border border-rose-200 flex items-center p-3 gap-3 transition-colors hover:bg-rose-50">
                    <div className="bg-white border border-rose-200/50 text-rose-600 rounded-lg p-1.5 shrink-0 shadow-sm">
                        <AlertTriangle size={16} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h3 className="font-semibold text-[13px] tracking-tight text-rose-900 leading-snug">{alert.issue}</h3>
                        <div className="flex items-center gap-3 shrink-0">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-white border border-rose-200 text-rose-700 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                {alert.severity}
                            </span>
                            <span className="text-[11px] font-medium text-rose-700/70">{new Date(alert.timestamp).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
