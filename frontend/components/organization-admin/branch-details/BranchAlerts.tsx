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

    if (loading) return <div className="h-40 bg-slate-100 animate-pulse rounded-xl"></div>;

    if (data.length === 0) {
        return (
            <div className="bg-green-50 rounded-xl shadow-sm border border-green-100 p-4 flex items-start gap-3">
                <AlertTriangle className="text-green-600 mt-0.5" size={18} />
                <div>
                    <h3 className="font-semibold text-green-900">No Active Alerts</h3>
                    <p className="text-sm text-green-700 mt-1">Branch is operating normally without any registered issues.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {data.map((alert, i) => (
                <div key={i} className="bg-red-50 rounded-xl shadow-sm border border-red-100 p-4 flex items-start gap-3">
                    <AlertTriangle className="text-red-600 mt-0.5" size={18} />
                    <div>
                        <h3 className="font-semibold text-red-900">{alert.issue}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-medium bg-red-100 text-red-800 px-2 py-0.5 rounded">{alert.severity} Severity</span>
                            <span className="text-xs text-red-700">{alert.timestamp}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
