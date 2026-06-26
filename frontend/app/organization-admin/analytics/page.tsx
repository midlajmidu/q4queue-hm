"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { 
    Users, Clock, Building2, TrendingUp, Zap, Server, 
    BarChart3, Activity, Download, ChevronRight, LayoutDashboard,
    AlertCircle, CheckCircle2, TrendingDown, Star, Sparkles, Lightbulb
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
            {/* Premium Header & Controls */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6 pb-6 border-b border-slate-200/60">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Executive Dashboard</h1>
                    <div className="flex items-center flex-wrap gap-2 text-sm text-slate-500 mt-2">
                        <span>Historical data, operational insights, and performance metrics.</span>
                        <span className="hidden sm:inline text-slate-300">•</span>
                        <div className="flex items-center gap-2 text-slate-500 font-mono text-[10px] tracking-widest uppercase font-semibold bg-slate-100/50 px-2 py-0.5 rounded-md border border-slate-200/50">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                            </span>
                            Updated just now
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full lg:w-auto shrink-0">
                    <DateRangeFilter onChange={setDateRange} initialPreset={dateRange.preset} />
                    <button 
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300 hover:shadow-sm px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm"
                    >
                        <Download size={16} />
                        <span className="hidden sm:inline">Export CSV</span>
                    </button>
                </div>
            </div>

            {/* Premium Glassmorphism AI Insights Panel */}
            {data.insights && data.insights.length > 0 && (
                <div className="relative overflow-hidden rounded-2xl">
                    {/* Gradient Orbs (The Light Source) */}
                    <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse z-0"></div>
                    <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 z-0"></div>

                    {/* The Frosted Glass Surface */}
                    <div className="relative z-10 p-6 md:p-8 bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col md:flex-row items-center gap-6 rounded-2xl">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <Lightbulb size={16} className="text-indigo-600 fill-indigo-600/30" />
                                <h3 className="font-bold text-indigo-600 uppercase tracking-widest text-[10px]">AI Strategic Insight</h3>
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 leading-tight">
                                {data.insights[0]}
                            </h2>
                        </div>
                        {data.insights.length > 1 && (
                            <div className="w-full md:w-1/3 border-t md:border-t-0 md:border-l border-white/50 pt-4 md:pt-0 md:pl-6">
                                <ul className="space-y-2">
                                    {data.insights.slice(1).map((insight: string, idx: number) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                                            <span className="leading-snug">{insight}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Merged High-Density KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Efficiency Focus */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Activity size={16} className="text-indigo-500" />
                            <h2 className="font-semibold text-slate-900 text-sm">Efficiency Metrics</h2>
                        </div>
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">Average</span>
                    </div>
                    <div className="p-5 grid grid-cols-2 lg:grid-cols-4 gap-4 flex-1 items-center">
                        <div>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Wait Time</p>
                            <p className="text-2xl font-bold text-slate-900">{data.time_metrics.avg_wait_time}</p>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Service Time</p>
                            <p className="text-2xl font-bold text-slate-900">{data.time_metrics.avg_service_time}</p>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Completion</p>
                            <div className="flex items-center gap-1.5">
                                <p className="text-2xl font-bold text-slate-900">{data.customer_metrics.completion_rate}</p>
                                {parseFloat(data.customer_metrics.completion_rate) > 90 && <span className="bg-emerald-50 text-emerald-700 px-1.5 rounded-full text-[10px] font-bold">Good</span>}
                            </div>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Live Queues</p>
                            <p className="text-2xl font-bold text-slate-900">{data.operations_metrics.active_queues}</p>
                        </div>
                    </div>
                </div>

                {/* Volume Focus */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Users size={16} className="text-indigo-500" />
                            <h2 className="font-semibold text-slate-900 text-sm">Volume & Scale</h2>
                        </div>
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">Total</span>
                    </div>
                    <div className="p-5 grid grid-cols-2 lg:grid-cols-4 gap-4 flex-1 items-center">
                        <div>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Served</p>
                            <p className="text-2xl font-bold text-emerald-600">{data.customer_metrics.customers_served}</p>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Waiting</p>
                            <p className="text-2xl font-bold text-indigo-600">{data.customer_metrics.customers_waiting}</p>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Peak Hour</p>
                            <p className="text-xl font-bold text-rose-600">{data.time_metrics.peak_hour}</p>
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Branches</p>
                            <p className="text-2xl font-bold text-slate-900">{data.operations_metrics.active_branches}</p>
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
                                    cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: 'none' }}
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    labelFormatter={(val) => new Date(val).toLocaleDateString()}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="customers_served" 
                                    name="Served" 
                                    stroke="#6366f1" 
                                    strokeWidth={2}
                                    fillOpacity={0.1} 
                                    fill="#6366f1" 
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
                            <Star size={18} className="text-indigo-500 fill-indigo-500/20" />
                            Branch Performance Ranking
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[13px] whitespace-nowrap">
                            <thead className="bg-slate-50/80 border-b border-slate-200">
                                <tr className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">
                                    <th className="py-2.5 px-4">Rank</th>
                                    <th className="py-2.5 px-4">Branch</th>
                                    <th className="py-2.5 px-4 text-right">Served</th>
                                    <th className="py-2.5 px-4 text-right">Health</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.branch_ranking.length === 0 ? (
                                    <tr><td colSpan={4} className="py-8 px-4 text-center text-slate-400">No branches found</td></tr>
                                ) : (
                                    data.branch_ranking.map((item: any) => (
                                        <tr key={item.rank} className="hover:bg-slate-50/50 transition-colors cursor-pointer">
                                            <td className="py-2 px-4 font-semibold text-slate-400">#{item.rank}</td>
                                            <td className="py-2 px-4 font-semibold text-slate-900">{item.branch}</td>
                                            <td className="py-2 px-4 text-right font-medium text-slate-700">{item.customers_served}</td>
                                            <td className="py-2 px-4 text-right">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    item.health_score >= 95 ? "bg-emerald-50 text-emerald-700" :
                                                    item.health_score >= 80 ? "bg-indigo-50 text-indigo-700" :
                                                    item.health_score >= 60 ? "bg-slate-100 text-slate-700" :
                                                    "bg-rose-50 text-rose-700"
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
                            <LayoutDashboard size={18} className="text-indigo-500" />
                            Top Queues by Volume
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[13px] whitespace-nowrap">
                            <thead className="bg-slate-50/80 border-b border-slate-200">
                                <tr className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">
                                    <th className="py-2.5 px-4">Queue Name</th>
                                    <th className="py-2.5 px-4">Branch</th>
                                    <th className="py-2.5 px-4 text-right">Served</th>
                                    <th className="py-2.5 px-4 text-right">Avg Wait</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.queue_analytics.length === 0 ? (
                                    <tr><td colSpan={4} className="py-8 px-4 text-center text-slate-400">No queues found</td></tr>
                                ) : (
                                    data.queue_analytics.map((item: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors cursor-pointer">
                                            <td className="py-2 px-4 font-semibold text-slate-900">{item.queue_name}</td>
                                            <td className="py-2 px-4 text-slate-500">{item.branch}</td>
                                            <td className="py-2 px-4 text-right font-medium text-slate-700">{item.customers_served}</td>
                                            <td className="py-2 px-4 text-right font-medium text-slate-600">{item.avg_wait_time}</td>
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
                            <Users size={18} className="text-emerald-500" />
                            Top Performing Staff
                        </h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[13px] whitespace-nowrap">
                            <thead className="bg-slate-50/80 border-b border-slate-200">
                                <tr className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">
                                    <th className="py-2.5 px-4">Staff Name</th>
                                    <th className="py-2.5 px-4">Branch</th>
                                    <th className="py-2.5 px-4 text-right">Served</th>
                                    <th className="py-2.5 px-4 text-right">Avg Service</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.staff_performance.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-12 px-4 text-center">
                                            <p className="text-slate-500 text-sm mb-3">No active staff data for the selected period.</p>
                                            <button className="text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-md transition-colors">
                                                View Staff Schedule
                                            </button>
                                        </td>
                                    </tr>
                                ) : (
                                    data.staff_performance.map((item: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors cursor-pointer">
                                            <td className="py-2 px-4 font-semibold text-slate-900 flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[9px] font-bold">
                                                    {item.staff_name.charAt(0).toUpperCase()}
                                                </div>
                                                {item.staff_name}
                                            </td>
                                            <td className="py-2 px-4 text-slate-500">{item.branch}</td>
                                            <td className="py-2 px-4 text-right font-medium text-emerald-600">{item.customers_served}</td>
                                            <td className="py-2 px-4 text-right font-medium text-slate-600">{item.avg_service_time}</td>
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
                        <table className="w-full text-left text-[13px] whitespace-nowrap">
                            <thead className="bg-slate-50/80 border-b border-slate-200">
                                <tr className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">
                                    <th className="py-2.5 px-4">Time Block</th>
                                    <th className="py-2.5 px-4 text-right">Arrived</th>
                                    <th className="py-2.5 px-4 text-right">Served</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.peak_traffic.length === 0 ? (
                                    <tr><td colSpan={3} className="py-8 px-4 text-center text-slate-400">No traffic data</td></tr>
                                ) : (
                                    data.peak_traffic.map((item: any, idx: number) => (
                                        <tr key={idx} className={`transition-colors cursor-pointer ${item.is_peak ? 'bg-rose-50/50 hover:bg-rose-50' : 'hover:bg-slate-50/50'}`}>
                                            <td className="py-2 px-4 font-semibold text-slate-900 flex items-center gap-2">
                                                {item.time_block}
                                                {item.is_peak && <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-700 uppercase tracking-wider">Peak</span>}
                                            </td>
                                            <td className="py-2 px-4 text-right font-medium text-indigo-600">{item.customers_arrived}</td>
                                            <td className="py-2 px-4 text-right font-medium text-emerald-600">{item.customers_served}</td>
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
