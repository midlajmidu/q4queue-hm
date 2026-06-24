"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

export default function BranchStaffOverview({ branchId }: { branchId: string }) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getBranchStaffOverview(branchId).then(setData).finally(() => setLoading(false));
    }, [branchId]);

    if (loading) return <div className="h-40 bg-slate-100 animate-pulse rounded-xl"></div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 font-semibold text-slate-900">Staff Overview</div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                        <tr>
                            <th className="p-3 font-medium">Name</th>
                            <th className="p-3 font-medium text-center">Status</th>
                            <th className="p-3 font-medium text-center">Sessions</th>
                            <th className="p-3 font-medium text-center">Served Today</th>
                            <th className="p-3 font-medium">Last Login</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.map((s, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                                <td className="p-3 font-medium text-slate-900">{s.name}</td>
                                <td className="p-3 text-center"><span className={`px-2 py-0.5 rounded text-xs ${s.status === 'Online' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>{s.status}</span></td>
                                <td className="p-3 text-center">{s.sessions_managed}</td>
                                <td className="p-3 text-center">{s.customers_served_today}</td>
                                <td className="p-3 text-slate-500">{s.last_login}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
