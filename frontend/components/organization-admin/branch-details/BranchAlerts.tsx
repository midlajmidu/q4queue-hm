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

    if (loading) return <div className="h-40 bg-slate-100 animate-pulse rounded-2xl"></div>;

    if (data.length === 0) {
        return null;
    }

    return (
        <div className="space-y-4">
            {data.map((alert, i) => (
                <div key={i} className="bg-red-50 rounded-2xl shadow-sm shadow-red-100/50 border border-red-100 p-5 flex items-start gap-4 transition-all hover:shadow-md hover:shadow-red-100">
                    <AlertTriangle className="text-red-600 mt-0.5 shrink-0" size={20} strokeWidth={1.5} />
                    <div>
                        <h3 className="font-semibold tracking-tight text-red-900">{alert.issue}</h3>
                        <div className="flex items-center gap-3 mt-2">
                            <span className="text-[11px] font-semibold tracking-wider uppercase bg-red-100 text-red-800 px-2.5 py-1 rounded-md">{alert.severity}</span>
                            <span className="text-xs font-medium text-red-700/80">{new Date(alert.timestamp).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
