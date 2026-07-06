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
        <div className="space-y-4">
            {data.map((alert, i) => (
                <div key={i} className="group relative bg-white rounded-2xl border border-red-200 overflow-hidden transition-all hover:shadow-md hover:shadow-red-50 hover:-translate-y-[1px]">
                    {/* Left glowing edge */}
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 group-hover:bg-red-600 transition-colors"></div>
                    
                    <div className="p-5 pl-6 flex items-start gap-4">
                        <div className="p-2 bg-red-50 rounded-lg text-red-600 mt-0.5 shrink-0 group-hover:bg-red-100 transition-colors">
                            <AlertTriangle size={20} strokeWidth={2} />
                        </div>
                        <div>
                            <h3 className="font-bold tracking-tight text-slate-900 group-hover:text-red-900 transition-colors">{alert.issue}</h3>
                            <div className="flex items-center gap-3 mt-2">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase border bg-red-50 text-red-700 border-red-200/50">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                    {alert.severity}
                                </span>
                                <span className="text-xs font-medium text-slate-500 group-hover:text-red-700/80 transition-colors">{new Date(alert.timestamp).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
