"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { OrgAnalyticsDetail } from "@/types/api";

export default function SuperAdminAnalyticsPage() {
    const [timeframe, setTimeframe] = useState<"daily" | "weekly" | "monthly">("daily");
    const [data, setData] = useState<OrgAnalyticsDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const loadData = async (tf: "daily" | "weekly" | "monthly") => {
        setLoading(true);
        try {
            const res = await api.getOrgAnalytics(tf);
            setData(res.items || []);
        } catch (error) {
            console.error("Failed to load analytics", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData(timeframe);
    }, [timeframe]);

    const filteredData = data.filter(d => 
        d.organization_name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                        Organization Analytics
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">Detailed usage metrics and performance across all organizations.</p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
                <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex flex-col md:flex-row gap-4 justify-between">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search organization..."
                            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-colors"
                        />
                    </div>

                    {/* Timeframe Toggles */}
                    <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-xl shrink-0">
                        {(["daily", "weekly", "monthly"] as const).map(tf => (
                            <button
                                key={tf}
                                onClick={() => setTimeframe(tf)}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
                                    timeframe === tf
                                        ? "bg-slate-800 text-white shadow-sm"
                                        : "text-slate-400 hover:text-slate-200"
                                }`}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-slate-800/50 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Organization</th>
                                <th className="px-6 py-4">Queue Entries</th>
                                <th className="px-6 py-4">Customers Served</th>
                                <th className="px-6 py-4">Messages Sent</th>
                                <th className="px-6 py-4">Avg Wait Time</th>
                                <th className="px-6 py-4">Peak Usage Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="flex justify-center items-center gap-2 text-slate-400">
                                            <svg className="animate-spin w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Loading analytics...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredData.length > 0 ? (
                                filteredData.map(org => (
                                    <tr key={org.org_id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-200">
                                            {org.organization_name}
                                        </td>
                                        <td className="px-6 py-4 tabular-nums font-semibold text-slate-300">
                                            {org.queue_entries.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 tabular-nums font-semibold text-emerald-400">
                                            {org.customers_served.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 tabular-nums font-semibold text-blue-400">
                                            {org.messages_sent.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-amber-400/90 font-medium text-xs">
                                            <span className="bg-amber-400/10 px-2 py-1 rounded">
                                                {org.average_wait_time}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-indigo-300 font-medium text-xs">
                                            <span className="bg-indigo-400/10 border border-indigo-400/20 px-2 py-1 rounded-md">
                                                {org.peak_usage_time}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        No organizations found for the selected timeframe.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer Status */}
                <div className="px-6 py-4 border-t border-slate-800/50 flex items-center justify-between text-xs text-slate-500">
                    <span>Showing metrics for {filteredData.length} organization(s)</span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Data is live
                    </span>
                </div>
            </div>
        </div>
    );
}
