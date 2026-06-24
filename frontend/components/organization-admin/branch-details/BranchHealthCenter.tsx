"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export default function BranchHealthCenter({ branchId }: { branchId: string }) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getBranchHealth(branchId).then(setData).finally(() => setLoading(false));
    }, [branchId]);

    if (loading) return <div className="h-40 bg-slate-100 animate-pulse rounded-xl"></div>;
    if (!data) return null;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 font-semibold text-slate-900 flex justify-between">
                Branch Health Center
                <span className={`px-2 py-0.5 text-xs rounded ${data.status === 'Healthy' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                    Score: {data.health_score}/100
                </span>
            </div>
            <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between items-center"><span className="text-slate-500">Queues:</span> <span className="font-medium text-slate-900">{data.queue_health}</span></div>
                <div className="flex justify-between items-center"><span className="text-slate-500">Sessions:</span> <span className="font-medium text-slate-900">{data.session_health}</span></div>
                <div className="flex justify-between items-center"><span className="text-slate-500">Staff:</span> <span className="font-medium text-slate-900">{data.staff_availability}</span></div>
                <div className="flex justify-between items-center"><span className="text-slate-500">WhatsApp:</span> <span className="font-medium text-slate-900">{data.whatsapp_health}</span></div>
            </div>
        </div>
    );
}
