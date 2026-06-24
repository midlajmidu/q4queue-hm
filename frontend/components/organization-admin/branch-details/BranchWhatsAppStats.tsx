"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export default function BranchWhatsAppStats({ branchId }: { branchId: string }) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getBranchWhatsAppStats(branchId).then(setData).finally(() => setLoading(false));
    }, [branchId]);

    if (loading) return <div className="h-40 bg-slate-100 animate-pulse rounded-xl"></div>;
    if (!data) return null;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 font-semibold text-slate-900">WhatsApp Statistics</div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                    <div className="text-sm text-slate-500">Sent Today</div>
                    <div className="text-xl font-semibold mt-1">{data.messages_sent_today}</div>
                </div>
                <div>
                    <div className="text-sm text-slate-500">Delivered</div>
                    <div className="text-xl font-semibold mt-1 text-green-600">{data.delivered}</div>
                </div>
                <div>
                    <div className="text-sm text-slate-500">Failed</div>
                    <div className="text-xl font-semibold mt-1 text-red-600">{data.failed}</div>
                </div>
                <div>
                    <div className="text-sm text-slate-500">Success Rate</div>
                    <div className="text-xl font-semibold mt-1">{data.success_rate}%</div>
                </div>
            </div>
        </div>
    );
}
