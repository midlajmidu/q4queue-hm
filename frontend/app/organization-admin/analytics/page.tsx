"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { BarChart3, Users, Clock, CheckCircle2, XCircle } from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useBranchFilter } from "@/context/BranchFilterContext";

export default function AnalyticsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const { selectedBranchId } = useBranchFilter();

    useEffect(() => {
        api.getOrgAdminAnalytics(selectedBranchId || undefined)
            .then(res => {
                setData(res);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [selectedBranchId]);

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Cross-Branch Analytics</h1>
                <p className="text-sm text-slate-500 mt-1">Aggregate performance data across all branches.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Today */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h2 className="font-bold text-slate-900 mb-4 border-b pb-2">Today</h2>
                    <div className="space-y-4">
                        <div className="flex justify-between">
                            <span className="text-sm text-slate-500">Total Customers</span>
                            <span className="font-medium text-slate-900">{data.today.total_customers}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-slate-500">Avg Wait Time</span>
                            <span className="font-medium text-slate-900">{data.today.avg_wait_time}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-slate-500">Peak Hour</span>
                            <span className="font-medium text-slate-900">{data.today.peak_hour}</span>
                        </div>
                    </div>
                </div>

                {/* This Week */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h2 className="font-bold text-slate-900 mb-4 border-b pb-2">This Week</h2>
                    <div className="space-y-4">
                        <div className="flex justify-between">
                            <span className="text-sm text-slate-500">Total Customers</span>
                            <span className="font-medium text-slate-900">{data.this_week.total_customers}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-slate-500">Avg Wait Time</span>
                            <span className="font-medium text-slate-900">{data.this_week.avg_wait_time}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-slate-500">Peak Hour</span>
                            <span className="font-medium text-slate-900">{data.this_week.peak_hour}</span>
                        </div>
                    </div>
                </div>

                {/* This Month */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h2 className="font-bold text-slate-900 mb-4 border-b pb-2">This Month</h2>
                    <div className="space-y-4">
                        <div className="flex justify-between">
                            <span className="text-sm text-slate-500">Total Customers</span>
                            <span className="font-medium text-slate-900">{data.this_month.total_customers}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-slate-500">Avg Wait Time</span>
                            <span className="font-medium text-slate-900">{data.this_month.avg_wait_time}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-sm text-slate-500">Peak Hour</span>
                            <span className="font-medium text-slate-900">{data.this_month.peak_hour}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Branch Comparison */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                    <h2 className="font-bold text-slate-900">Branch Comparison Table</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                                <th className="p-4">Branch</th>
                                <th className="p-4 text-center">Customers</th>
                                <th className="p-4 text-center">Wait Time</th>
                                <th className="p-4 text-center">Completion Rate</th>
                                <th className="p-4 text-center">Avg Service Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.branch_comparison.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">No comparison data available</td>
                                </tr>
                            ) : (
                                data.branch_comparison.map((item: any, idx: number) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="p-4 font-medium text-slate-900">{item.branch}</td>
                                        <td className="p-4 text-center">{item.customers}</td>
                                        <td className="p-4 text-center">{item.wait_time}</td>
                                        <td className="p-4 text-center">{item.completion_rate}</td>
                                        <td className="p-4 text-center">{item.avg_service_time}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
