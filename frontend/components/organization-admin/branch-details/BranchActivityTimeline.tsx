"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export default function BranchActivityTimeline({ branchId }: { branchId: string }) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getBranchTimeline(branchId).then(setData).finally(() => setLoading(false));
    }, [branchId]);

    if (loading) return <div className="h-40 bg-slate-100 animate-pulse rounded-xl"></div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 font-semibold text-slate-900">Recent Activity Timeline</div>
            <div className="p-4 space-y-4">
                {data.map((event, i) => (
                    <div key={i} className="flex gap-3">
                        <div className="w-2 h-2 mt-1.5 rounded-full bg-indigo-400 shrink-0" />
                        <div>
                            <div className="text-sm font-medium text-slate-900">{event.event_type}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{event.description}</div>
                            <div className="text-xs text-slate-400 mt-1">{new Date(event.timestamp).toLocaleString()}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
