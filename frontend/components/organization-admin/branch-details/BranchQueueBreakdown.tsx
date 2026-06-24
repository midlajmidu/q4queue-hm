"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export default function BranchQueueBreakdown({ branchId }: { branchId: string }) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getBranchQueuesOverview(branchId).then(setData).finally(() => setLoading(false));
    }, [branchId]);

    if (loading) return <div className="h-40 bg-slate-100 animate-pulse rounded-xl"></div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 font-semibold text-slate-900">Queue Breakdown</div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                        <tr>
                            <th className="p-3 font-medium">Queue Name</th>
                            <th className="p-3 font-medium text-center">Status</th>
                            <th className="p-3 font-medium text-center">Current</th>
                            <th className="p-3 font-medium text-center">Waiting</th>
                            <th className="p-3 font-medium text-center">Completed</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.map((q, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                                <td className="p-3 font-medium text-slate-900">{q.queue_name}</td>
                                <td className="p-3 text-center"><span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">{q.status}</span></td>
                                <td className="p-3 text-center font-mono">{q.current_token}</td>
                                <td className="p-3 text-center">{q.waiting_count}</td>
                                <td className="p-3 text-center">{q.completed_today}</td>
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr><td colSpan={5} className="p-4 text-center text-slate-500">No queues active</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
