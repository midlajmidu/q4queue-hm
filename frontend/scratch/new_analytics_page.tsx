"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { 
    Users, Clock, Building2, TrendingUp, Zap, Server, 
    BarChart3, Activity, Download, ChevronRight, LayoutDashboard,
    AlertCircle, CheckCircle2, TrendingDown, Star
} from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useBranchFilter } from "@/context/BranchFilterContext";
import DateRangeFilter, { DateRange } from "@/components/organization-admin/DateRangeFilter";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Area, AreaChart
} from "recharts";

export default function AnalyticsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<DateRange>({ start_date: null, end_date: null, preset: "today" });

    const { selectedBranchId } = useBranchFilter();

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const res = await api.getOrgAdminAnalytics(
                selectedBranchId || undefined, 
                dateRange.start_date || undefined, 
                dateRange.end_date || undefined
            );
            setData(res);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, [selectedBranchId, dateRange]);

    const handleExportCSV = () => {
        let url = `/api/v1/organization-admin/analytics/export?`;
        const params = new URLSearchParams();
        if (selectedBranchId) params.append("branch_id", selectedBranchId);
        if (dateRange.start_date) params.append("start_date", dateRange.start_date);
        if (dateRange.end_date) params.append("end_date", dateRange.end_date);
        
        window.location.href = url + params.toString();
    };

    if (loading && !data) {
        return (
            <div className="flex h-[calc(100vh-200px)] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <LoadingSpinner />
                    <p className="text-sm font-medium text-slate-500 animate-pulse">Aggregating cross-branch metrics...</p>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="space-y-6 pb-20">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Dashboard</h1>
                    <p className="text-sm text-slate-500 mt-1">Cross-branch operational insights and performance metrics.</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <DateRangeFilter onChange={setDateRange} initialPreset={dateRange.preset} />
                    <button 
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
                    >
                        <Download size={16} />
                        <span className="hidden sm:inline">Export CSV</span>
                    </button>
                </div>
            </div>

            {/* AI Insights Panel */}
            {data.insights && data.insights.length > 0 && (
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-5 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
                            <Zap size={20} className="text-amber-500 fill-amber-500/20" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 mb-2">Key Insights</h3>
                            <ul className="space-y-2">
                                {data.insights.map((insight: string, idx: number) => (
                                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                                        {insight}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Customer Metrics */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Users size={18} /></div>
                        <h2 className="font-semibold text-slate-900">Customer Metrics</h2>
                    </div>
                    <div className="p-5 grid grid-cols-2 gap-4 flex-1">
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Total</p>
                            <p className="text-2xl font-bold text-slate-900">{data.customer_metrics.total_customers}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Served</p>
                            <p className="text-2xl font-bold text-emerald-600">{data.customer_metrics.customers_served}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Waiting</p>
                            <p className="text-2xl font-bold text-amber-500">{data.customer_metrics.customers_waiting}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Completion</p>
                            <p className="text-2xl font-bold text-slate-900">{data.customer_metrics.completion_rate}</p>
                        </div>
                    </div>
                </div>

                {/* Time Metrics */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Clock size={18} /></div>
                        <h2 className="font-semibold text-slate-900">Time Metrics</h2>
                    </div>
                    <div className="p-5 grid grid-cols-2 gap-4 flex-1">
                        <div className="col-span-2 sm:col-span-1">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Avg Wait</p>
                            <p className="text-xl font-bold text-slate-900">{data.time_metrics.avg_wait_time}</p>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Avg Service</p>
                            <p className="text-xl font-bold text-slate-900">{data.time_metrics.avg_service_time}</p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Peak Hour</p>
                            <p className="text-lg font-semibold text-rose-600">{data.time_metrics.peak_hour}</p>
                        </div>
                    </div>
                </div>

                {/* Operations Metrics */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Activity size={18} /></div>
                        <h2 className="font-semibold text-slate-900">Operations Status</h2>
                    </div>
                    <div className="p-5 grid grid-cols-2 gap-4 flex-1">
                        <div className="col-span-2">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Active Branches</p>
                            <div className="flex items-center gap-2">
                                <Building2 size={20} className="text-slate-400" />
                                <p className="text-2xl font-bold text-slate-900">{data.operations_metrics.active_branches}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Live Queues</p>
                            <p className="text-xl font-bold text-slate-900">{data.operations_metrics.active_queues}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Live Sessions</p>
                            <p className="text-xl font-bold text-slate-900">{data.operations_metrics.active_sessions}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Volume Trend Chart */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="font-bold text-slate-900 flex items-center gap-2">
                            <TrendingUp size={20} className="text-indigo-500" />
                            Customer Volume Trend
                        </h2>
                        <p className="text-sm text-slate-500">Customers served over the selected period</p>
                    </div>
                </div>
                <div className="h-[300px] w-full">
                    {data.volume_trend && data.volume_trend.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.volume_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorServed" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis 
                                    dataKey="date" 
                                    tick={{fontSize: 12, fill: '#64748b'}} 
                                    tickFormatter={(val) => {
                                        const d = new Date(val);
                                        return `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
                                    }}
                                    axisLine={false}
                                    tickLine={false}
                                    dy={10}
                                />
                                <YAxis 
                                    tick={{fontSize: 12, fill: '#64748b'}} 
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <RechartsTooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                                    labelFormatter={(val) => new Date(val).toLocaleDateString()}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="customers_served" 
                                    name="Served" 
                                    stroke="#6366f1" 
                                    strokeWidth={3}
                                    fillOpacity={1} 
                                    fill="url(#colorServed)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                            <BarChart3 size={48} className="mb-2 opacity-20" />
                            <p>No trend data available for this period</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Complex Tables Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                
                {/* Branch Performance Ranking */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h2 className="font-bold text-slate-900 flex items-center gap-2">
                            <Star size={18} className="text-amber-500 fill-amber-500" />
                            Branch Performance Ranking
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead>
                                <tr className="bg-white border-b border-slate-100 text-xs uppercase text-slate-500 font-semibold">
                                    <th className="p-4">Rank</th>
                                    <th className="p-4">Branch</th>
                                    <th className="p-4 text-center">Served</th>
                                    <th className="p-4 text-center">Health</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {data.branch_ranking.length === 0 ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-slate-400">No branches found</td></tr>
                                ) : (
                                    data.branch_ranking.map((item: any) => (
                                        <tr key={item.rank} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4 font-medium text-slate-400">#{item.rank}</td>
                                            <td className="p-4 font-medium text-slate-900">{item.branch}</td>
                                            <td className="p-4 text-center font-medium">{item.customers_served}</td>
                                            <td className="p-4 text-center">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                                    item.health_score >= 95 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                                    item.health_score >= 80 ? "bg-blue-50 text-blue-700 border-blue-200" :
                                                    item.health_score >= 60 ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                    "bg-rose-50 text-rose-700 border-rose-200"
                                                }`}>
                                                    {item.health_score} ({item.health_status})
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Queue Analytics */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h2 className="font-bold text-slate-900 flex items-center gap-2">
                            <LayoutDashboard size={18} className="text-blue-500" />
                            Top Queues by Volume
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead>
                                <tr className="bg-white border-b border-slate-100 text-xs uppercase text-slate-500 font-semibold">
                                    <th className="p-4">Queue Name</th>
                                    <th className="p-4">Branch</th>
                                    <th className="p-4 text-center">Served</th>
                                    <th className="p-4 text-right">Avg Wait</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {data.queue_analytics.length === 0 ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-slate-400">No queues found</td></tr>
                                ) : (
                                    data.queue_analytics.map((item: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4 font-medium text-slate-900">{item.queue_name}</td>
                                            <td className="p-4 text-slate-500">{item.branch}</td>
                                            <td className="p-4 text-center font-medium">{item.customers_served}</td>
                                            <td className="p-4 text-right font-mono text-xs text-slate-600">{item.avg_wait_time}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Staff Performance */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h2 className="font-bold text-slate-900 flex items-center gap-2">
                            <Users size={18} className="text-teal-500" />
                            Top Performing Staff
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead>
                                <tr className="bg-white border-b border-slate-100 text-xs uppercase text-slate-500 font-semibold">
                                    <th className="p-4">Staff Name</th>
                                    <th className="p-4">Branch</th>
                                    <th className="p-4 text-center">Served</th>
                                    <th className="p-4 text-right">Avg Service</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {data.staff_performance.length === 0 ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-slate-400">No staff found</td></tr>
                                ) : (
                                    data.staff_performance.map((item: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4 font-medium text-slate-900 flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                                                    {item.staff_name.charAt(0).toUpperCase()}
                                                </div>
                                                {item.staff_name}
                                            </td>
                                            <td className="p-4 text-slate-500">{item.branch}</td>
                                            <td className="p-4 text-center font-medium text-emerald-600">{item.customers_served}</td>
                                            <td className="p-4 text-right font-mono text-xs text-slate-600">{item.avg_service_time}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Peak Traffic Analysis */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h2 className="font-bold text-slate-900 flex items-center gap-2">
                            <Activity size={18} className="text-rose-500" />
                            Hourly Traffic Distribution
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead>
                                <tr className="bg-white border-b border-slate-100 text-xs uppercase text-slate-500 font-semibold">
                                    <th className="p-4">Time Block</th>
                                    <th className="p-4 text-center">Arrived</th>
                                    <th className="p-4 text-center">Served</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {data.peak_traffic.length === 0 ? (
                                    <tr><td colSpan={3} className="p-8 text-center text-slate-400">No traffic data</td></tr>
                                ) : (
                                    data.peak_traffic.map((item: any, idx: number) => (
                                        <tr key={idx} className={`transition-colors ${item.is_peak ? 'bg-rose-50/50 hover:bg-rose-50' : 'hover:bg-slate-50'}`}>
                                            <td className="p-4 font-medium text-slate-900 flex items-center gap-2">
                                                {item.time_block}
                                                {item.is_peak && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 uppercase tracking-wider">Peak</span>}
                                            </td>
                                            <td className="p-4 text-center font-medium">{item.customers_arrived}</td>
                                            <td className="p-4 text-center text-slate-600">{item.customers_served}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}
