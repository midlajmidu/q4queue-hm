"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { 
    Users, Clock, Building2, TrendingUp, Zap, Server, 
    BarChart3, Activity, Download, ChevronRight, LayoutDashboard,
    AlertCircle, CheckCircle2, TrendingDown, Star, Sparkles, Lightbulb,
    UserMinus, UserCheck, Target, Layers, FileText, FileSpreadsheet, ChevronDown
} from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useBranchFilter } from "@/context/BranchFilterContext";
import DateRangeFilter, { DateRange } from "@/components/organization-admin/DateRangeFilter";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Area, AreaChart,
    BarChart, Bar, ComposedChart, ReferenceLine, Cell
} from "recharts";

export default function AnalyticsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<DateRange>({ start_date: null, end_date: null, preset: "today" });
    
    // Pagination states
    const ITEMS_PER_PAGE = 5;
    const [branchPage, setBranchPage] = useState(1);
    const [queuePage, setQueuePage] = useState(1);
    const [staffPage, setStaffPage] = useState(1);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

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
            // Reset pagination when data changes
            setBranchPage(1);
            setQueuePage(1);
            setStaffPage(1);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, [selectedBranchId, dateRange]);

    const [isExporting, setIsExporting] = useState(false);

    const handleExportCSV = async () => {
        try {
            setIsExporting(true);
            const blob = await api.exportOrgAdminAnalytics({
                branch_id: selectedBranchId || undefined,
                start_date: dateRange.start_date || undefined,
                end_date: dateRange.end_date || undefined,
            });
            
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `q4queue_analytics_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to export CSV:", error);
        } finally {
            setIsExporting(false);
        }
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
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-6 pb-6 border-b border-slate-200/60">
                <div>
                    <h1 className="text-[2rem] font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500">
                        Executive Dashboard
                    </h1>
                    <div className="flex items-center flex-wrap gap-2.5 text-sm text-slate-500 mt-2">
                        <span className="leading-none font-medium text-slate-500">Historical data, operational insights, and performance metrics.</span>
                        <span className="hidden sm:flex items-center text-slate-300 leading-none">•</span>
                        <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[10px] tracking-widest uppercase font-semibold bg-slate-100/50 px-2 py-1 rounded-md border border-slate-200/50 leading-none">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                            </span>
                            <span>Updated just now</span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0 print:hidden">
                    <DateRangeFilter onChange={setDateRange} initialPreset={dateRange.preset} />
                    
                    <div className="relative w-full sm:w-auto">
                        <button 
                            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                            disabled={isExporting}
                            className={`group flex items-center justify-center gap-2.5 w-full sm:w-auto bg-white border ${isExportMenuOpen ? 'border-indigo-300 ring-2 ring-indigo-50' : 'border-slate-200/80'} text-slate-700 hover:text-indigo-700 hover:border-indigo-200 hover:bg-indigo-50/30 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none`}
                        >
                            {isExporting ? (
                                <div className="w-4 h-4 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin"></div>
                            ) : (
                                <Download size={16} className={`transition-colors ${isExportMenuOpen ? 'text-indigo-500' : 'text-slate-400 group-hover:text-indigo-500'}`} />
                            )}
                            <span>{isExporting ? 'Exporting...' : 'Export'}</span>
                            <ChevronDown size={14} className={`transition-all duration-200 ${isExportMenuOpen ? 'text-indigo-500 rotate-180' : 'text-slate-400 group-hover:text-indigo-500'}`} />
                        </button>

                        {isExportMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsExportMenuOpen(false)}></div>
                                <div className="absolute right-0 sm:right-0 mt-2.5 w-full sm:w-60 bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/60 z-50 p-2 overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                    <div className="flex flex-col space-y-1">
                                        <button
                                            onClick={() => {
                                                setIsExportMenuOpen(false);
                                                window.print();
                                            }}
                                            className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 font-medium group"
                                        >
                                            <div className="bg-slate-100 group-hover:bg-indigo-100 p-1.5 rounded-md transition-colors">
                                                <FileText size={14} className="text-slate-500 group-hover:text-indigo-600 transition-colors" />
                                            </div>
                                            <div>
                                                <p>Export as PDF</p>
                                                <p className="text-[10px] text-slate-400 font-normal mt-0.5 leading-tight">Includes all graphs & visuals</p>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsExportMenuOpen(false);
                                                handleExportCSV();
                                            }}
                                            className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 font-medium group"
                                        >
                                            <div className="bg-slate-100 group-hover:bg-emerald-100 p-1.5 rounded-md transition-colors">
                                                <FileSpreadsheet size={14} className="text-slate-500 group-hover:text-emerald-600 transition-colors" />
                                            </div>
                                            <div>
                                                <p>Export as CSV / Excel</p>
                                                <p className="text-[10px] text-slate-400 font-normal mt-0.5 leading-tight">Raw spreadsheet data</p>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Apple Liquid Glass AI Insights Panel */}
            {data.insights && data.insights.length > 0 && (
                <div className="relative overflow-hidden rounded-2xl bg-[#fbfbfd]/70 backdrop-blur-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.06),inset_0_1px_0_0_rgba(255,255,255,0.9)]">
                    {/* Liquid Abstract Orbs */}
                    <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse z-0"></div>
                    <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-500/10 rounded-full mix-blend-multiply filter blur-3xl opacity-70 z-0"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-48 bg-emerald-400/5 rounded-full mix-blend-multiply filter blur-3xl opacity-50 z-0"></div>

                    <div className="relative z-10 p-6 md:p-7 flex flex-col md:flex-row items-start md:items-center gap-6">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3">
                                {data.insights[0].includes("🚨") ? (
                                    <AlertCircle size={15} className="text-rose-500" />
                                ) : (
                                    <Lightbulb size={15} className="text-slate-500" />
                                )}
                                <h3 className={`font-bold uppercase tracking-widest text-[11px] pt-0.5 ${data.insights[0].includes("🚨") ? "text-rose-500" : "text-slate-500"}`}>
                                    {data.insights[0].includes("🚨") ? "Critical Alert" : "AI Strategic Insight"}
                                </h3>
                            </div>
                            <h2 className={`text-xl font-semibold leading-relaxed tracking-tight ${data.insights[0].includes("🚨") ? "text-rose-900" : "text-slate-800"}`}>
                                {data.insights[0]}
                            </h2>
                        </div>
                        {data.insights.length > 1 && (
                            <div className="w-full md:w-1/3 border-t md:border-t-0 md:border-l border-slate-200/60 pt-4 md:pt-0 md:pl-6">
                                <ul className="space-y-3">
                                    {data.insights.slice(1).map((insight: string, idx: number) => {
                                        const isAlert = insight.includes("🚨");
                                        const isInsight = insight.includes("💡");
                                        const color = isAlert ? "bg-rose-500" : (isInsight ? "bg-amber-500" : "bg-blue-500");
                                        return (
                                            <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-600 font-medium">
                                                <div className={`w-1.5 h-1.5 rounded-full ${color} mt-1.5 shrink-0 shadow-sm`} />
                                                <span className={`leading-snug ${isAlert ? 'text-rose-900' : ''}`}>{insight}</span>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Merged High-Density KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                
                {/* Efficiency Focus */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Activity size={16} className="text-indigo-500" />
                            <h2 className="font-semibold text-slate-900 text-sm">Efficiency Metrics</h2>
                        </div>
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">Average</span>
                    </div>
                    <div className="p-5 grid grid-cols-2 gap-y-6 gap-x-6 flex-1 items-start">
                        <div className="flex flex-col group">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <Clock size={14} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Wait Time</p>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{data.time_metrics.avg_wait_time}</p>
                            <p className="text-[10px] text-slate-400 mt-1 leading-snug">Average duration customers wait before being served.</p>
                        </div>
                        <div className="flex flex-col group">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <Zap size={14} className="text-slate-400 group-hover:text-amber-500 transition-colors" />
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Service Time</p>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{data.time_metrics.avg_service_time}</p>
                            <p className="text-[10px] text-slate-400 mt-1 leading-snug">Average time staff spends serving each customer.</p>
                        </div>
                        <div className="flex flex-col group">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <CheckCircle2 size={14} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Completion</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <p className="text-2xl font-bold text-slate-900">{data.customer_metrics.completion_rate}</p>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 leading-snug">Percentage of queued customers successfully served.</p>
                        </div>
                        <div className="flex flex-col group">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <Layers size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                                    {dateRange.preset === "today" ? "Live Queues" : "Queues Operated"}
                                </p>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">
                                {dateRange.preset === "today" ? data.operations_metrics.active_queues : data.operations_metrics.operated_queues}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1 leading-snug">Total number of queue lanes active in this period.</p>
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
                    <div className="p-5 grid grid-cols-2 gap-y-6 gap-x-6 flex-1 items-start">
                        <div className="flex flex-col group">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <Users size={14} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Total Served</p>
                            </div>
                            <p className="text-2xl font-bold text-emerald-600">{data.customer_metrics.customers_served}</p>
                            <p className="text-[10px] text-slate-400 mt-1 leading-snug">Overall number of customers fully processed.</p>
                        </div>
                        <div className="flex flex-col group">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <Activity size={14} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Waiting</p>
                            </div>
                            <p className="text-2xl font-bold text-indigo-600">{data.customer_metrics.customers_waiting}</p>
                            <p className="text-[10px] text-slate-400 mt-1 leading-snug">Current volume of customers still in queue.</p>
                        </div>
                        <div className="flex flex-col group">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <TrendingUp size={14} className="text-slate-400 group-hover:text-rose-500 transition-colors" />
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Peak Hour</p>
                            </div>
                            <p className="text-xl font-bold text-rose-600">{data.time_metrics.peak_hour}</p>
                            <p className="text-[10px] text-slate-400 mt-1 leading-snug">The busiest hour by customer volume.</p>
                        </div>
                        <div className="flex flex-col group">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <Building2 size={14} className="text-slate-400 group-hover:text-slate-900 transition-colors" />
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Branches</p>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">{data.operations_metrics.active_branches}</p>
                            <p className="text-[10px] text-slate-400 mt-1 leading-snug">Number of active branches generating data.</p>
                        </div>
                    </div>
                </div>

                {/* Retention & Load */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:col-span-2 xl:col-span-1">
                    <div className="px-5 py-3 border-b border-slate-100 bg-rose-50/30 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <TrendingDown size={16} className="text-rose-500" />
                            <h2 className="font-semibold text-slate-900 text-sm">Retention & Load</h2>
                        </div>
                        <span className="bg-rose-100 text-rose-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">Critical</span>
                    </div>
                    <div className="p-5 grid grid-cols-2 gap-y-6 gap-x-6 flex-1 items-start">
                        <div className="flex flex-col group">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <UserMinus size={14} className="text-slate-400 group-hover:text-rose-500 transition-colors" />
                                <p className="text-[11px] font-bold text-rose-400 uppercase tracking-widest">Abandoned</p>
                            </div>
                            <p className="text-2xl font-bold text-rose-600">{data.customer_metrics.customers_abandoned}</p>
                            <p className="text-[10px] text-rose-400/80 mt-1 leading-snug">Customers who left the queue without service.</p>
                        </div>
                        <div className="flex flex-col group">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <TrendingDown size={14} className="text-slate-400 group-hover:text-rose-500 transition-colors" />
                                <p className="text-[11px] font-bold text-rose-400 uppercase tracking-widest">Churn Rate</p>
                            </div>
                            <p className="text-2xl font-bold text-rose-600">{data.customer_metrics.abandonment_rate}</p>
                            <p className="text-[10px] text-rose-400/80 mt-1 leading-snug">Percentage ratio of abandoned customers.</p>
                        </div>
                        <div className="flex flex-col group">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <UserCheck size={14} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Online Staff</p>
                            </div>
                            <p className="text-2xl font-bold text-emerald-600">{data.operations_metrics.online_staff}</p>
                            <p className="text-[10px] text-slate-400 mt-1 leading-snug">Number of staff members currently on shift.</p>
                        </div>
                        <div className="flex flex-col group">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <Target size={14} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Cust / Staff</p>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">
                                {data.operations_metrics.online_staff > 0 ? (data.customer_metrics.customers_waiting / data.operations_metrics.online_staff).toFixed(1) : "-"}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1 leading-snug">Average customer load per online staff member.</p>
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
                    {(() => {
                        let chartData = data.volume_trend || [];
                        if (chartData.length === 1) {
                            // If there is only one data point, inject the previous day with 0 volume
                            // so that Recharts can actually draw a trend line (slope) instead of a single dot.
                            const point = chartData[0];
                            const prevDate = new Date(point.date);
                            prevDate.setDate(prevDate.getDate() - 1);
                            chartData = [
                                { date: prevDate.toISOString(), customers_served: 0 },
                                point
                            ];
                        }
                        
                        return chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '8px 12px' }}
                                        labelStyle={{ fontWeight: 600, color: '#475569', marginBottom: '4px' }}
                                        labelFormatter={(val) => {
                                            const d = new Date(val);
                                            return `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear()}`;
                                        }}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="customers_served" 
                                        name="Served" 
                                        stroke="#6366f1" 
                                        strokeWidth={3}
                                        fillOpacity={1} 
                                        fill="url(#colorServed)" 
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                        dot={{ r: 4, strokeWidth: 2, fill: 'white', stroke: '#6366f1' }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                <BarChart3 size={48} className="mb-2 opacity-20" />
                                <p>No trend data available for this period</p>
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* Complex Tables Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                
                {/* Cross-Branch Wait Time Benchmark */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h2 className="font-bold text-slate-900 flex items-center gap-2">
                            <BarChart3 size={18} className="text-indigo-500" />
                            Cross-Branch Wait Benchmark
                        </h2>
                    </div>
                    <div className="p-5 h-[350px] w-full">
                        {data.branch_ranking.length === 0 ? (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                <p>No branches found</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart 
                                    data={data.branch_ranking.map((b: any) => ({
                                        name: b.branch,
                                        wait_minutes: Math.round(b.raw_wait_sec / 60),
                                        health: b.health_score,
                                        served: b.customers_served
                                    })).sort((a: any, b: any) => b.wait_minutes - a.wait_minutes)} 
                                    margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                    <YAxis type="number" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                    <RechartsTooltip 
                                        cursor={{fill: '#f1f5f9'}}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                        formatter={(value) => [`${value} min`, "Avg Wait Time"]}
                                    />
                                    {/* Platform Benchmark Line */}
                                    <ReferenceLine y={15} stroke="#ef4444" strokeDasharray="4 4" label={{ position: 'insideTopLeft', value: 'SLA Target (15m)', fill: '#ef4444', fontSize: 10, fontWeight: 600 }} />
                                    
                                    <Bar dataKey="wait_minutes" radius={[6, 6, 0, 0]} maxBarSize={50}>
                                        {
                                            data.branch_ranking.map((b: any, index: number) => {
                                                const wait = Math.round(b.raw_wait_sec / 60);
                                                // Dynamic color based on SLA (Red > 15m, Amber > 10m, Emerald < 10m)
                                                const color = wait >= 15 ? '#ef4444' : wait >= 10 ? '#f59e0b' : '#10b981';
                                                return <Cell key={`cell-${index}`} fill={color} />;
                                            })
                                        }
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                    <div className="bg-slate-50/50 px-5 py-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-3">
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"></div> <span className="font-medium text-slate-600">Optimal (&lt;10m)</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm"></div> <span className="font-medium text-slate-600">Approaching</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm"></div> <span className="font-medium text-slate-600">SLA Breach (&gt;15m)</span></div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <AlertCircle size={13} className="text-slate-400" />
                            <span>SLA = Target Max Wait Time</span>
                        </div>
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
                    <div className="overflow-x-auto flex-1">
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
                                    <>
                                        {data.queue_analytics.slice((queuePage - 1) * ITEMS_PER_PAGE, queuePage * ITEMS_PER_PAGE).map((item: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors cursor-pointer">
                                                <td className="py-2 px-4 font-semibold text-slate-900">{item.queue_name}</td>
                                                <td className="py-2 px-4 text-slate-500">{item.branch}</td>
                                                <td className="py-2 px-4 text-right font-medium text-slate-700">{item.customers_served}</td>
                                                <td className="py-2 px-4 text-right font-medium text-slate-600">{item.avg_wait_time}</td>
                                            </tr>
                                        ))}
                                        {data.queue_analytics.slice((queuePage - 1) * ITEMS_PER_PAGE, queuePage * ITEMS_PER_PAGE).length < ITEMS_PER_PAGE && (
                                            <tr>
                                                <td colSpan={4} className="p-0 bg-slate-50/30">
                                                    <div 
                                                        className="w-full flex items-center justify-center text-slate-400/60 text-[10px] font-bold uppercase tracking-widest"
                                                        style={{ height: `${(ITEMS_PER_PAGE - data.queue_analytics.slice((queuePage - 1) * ITEMS_PER_PAGE, queuePage * ITEMS_PER_PAGE).length) * 44}px` }}
                                                    >
                                                        — End of Data —
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {data.queue_analytics.length > ITEMS_PER_PAGE && (
                        <div className="p-3 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
                            <button 
                                onClick={() => setQueuePage(p => Math.max(1, p - 1))} 
                                disabled={queuePage === 1}
                                className="text-xs font-semibold text-slate-600 disabled:opacity-30 hover:text-slate-900 transition-colors"
                            >
                                Previous
                            </button>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                                Page {queuePage} of {Math.ceil(data.queue_analytics.length / ITEMS_PER_PAGE)}
                            </span>
                            <button 
                                onClick={() => setQueuePage(p => Math.min(Math.ceil(data.queue_analytics.length / ITEMS_PER_PAGE), p + 1))} 
                                disabled={queuePage === Math.ceil(data.queue_analytics.length / ITEMS_PER_PAGE)}
                                className="text-xs font-semibold text-slate-600 disabled:opacity-30 hover:text-slate-900 transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>

                {/* Staff Performance */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h2 className="font-bold text-slate-900 flex items-center gap-2">
                            <Users size={18} className="text-emerald-500" />
                            Top Performing Staff
                        </h2>
                    </div>
                    <div className="overflow-x-auto flex-1">
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
                                            <Link href="/organization-admin/monitoring/staff" className="inline-block text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-md transition-colors">
                                                View Staff Schedule
                                            </Link>
                                        </td>
                                    </tr>
                                ) : (
                                    <>
                                        {data.staff_performance.slice((staffPage - 1) * ITEMS_PER_PAGE, staffPage * ITEMS_PER_PAGE).map((item: any, idx: number) => (
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
                                        ))}
                                        {data.staff_performance.slice((staffPage - 1) * ITEMS_PER_PAGE, staffPage * ITEMS_PER_PAGE).length < ITEMS_PER_PAGE && (
                                            <tr>
                                                <td colSpan={4} className="p-0 bg-slate-50/30">
                                                    <div 
                                                        className="w-full flex items-center justify-center text-slate-400/60 text-[10px] font-bold uppercase tracking-widest"
                                                        style={{ height: `${(ITEMS_PER_PAGE - data.staff_performance.slice((staffPage - 1) * ITEMS_PER_PAGE, staffPage * ITEMS_PER_PAGE).length) * 44}px` }}
                                                    >
                                                        — End of Data —
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {data.staff_performance.length > ITEMS_PER_PAGE && (
                        <div className="p-3 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
                            <button 
                                onClick={() => setStaffPage(p => Math.max(1, p - 1))} 
                                disabled={staffPage === 1}
                                className="text-xs font-semibold text-slate-600 disabled:opacity-30 hover:text-slate-900 transition-colors"
                            >
                                Previous
                            </button>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                                Page {staffPage} of {Math.ceil(data.staff_performance.length / ITEMS_PER_PAGE)}
                            </span>
                            <button 
                                onClick={() => setStaffPage(p => Math.min(Math.ceil(data.staff_performance.length / ITEMS_PER_PAGE), p + 1))} 
                                disabled={staffPage === Math.ceil(data.staff_performance.length / ITEMS_PER_PAGE)}
                                className="text-xs font-semibold text-slate-600 disabled:opacity-30 hover:text-slate-900 transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>

                {/* Peak Traffic Analysis */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h2 className="font-bold text-slate-900 flex items-center gap-2">
                            <Activity size={18} className="text-rose-500" />
                            Hourly Traffic & Wait Time
                        </h2>
                    </div>
                    <div className="p-5 h-[350px] w-full">
                        {data.peak_traffic.length === 0 ? (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                <p>No traffic data available</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={data.peak_traffic} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="colorArrived" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="time_block" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} dy={10} />
                                    <YAxis yAxisId="left" tick={{fontSize: 10, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                    <YAxis yAxisId="right" orientation="right" tick={{fontSize: 10, fill: '#818cf8'}} axisLine={false} tickLine={false} />
                                    <RechartsTooltip 
                                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Area yAxisId="left" type="monotone" dataKey="customers_arrived" name="Arrived" stroke="#f43f5e" fillOpacity={1} fill="url(#colorArrived)" />
                                    <Area yAxisId="left" type="monotone" dataKey="customers_served" name="Served" stroke="#10b981" fillOpacity={0.1} fill="#10b981" />
                                    <Line yAxisId="right" type="monotone" dataKey="avg_wait_minutes" name="Avg Wait (min)" stroke="#818cf8" strokeWidth={3} dot={{r: 4}} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                    <div className="bg-slate-50/50 px-5 py-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-3">
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm"></div> <span className="font-medium text-slate-600">Arrived Customers</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm"></div> <span className="font-medium text-slate-600">Served Customers</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-indigo-400 shadow-sm"></div> <span className="font-medium text-slate-600">Avg Wait Time (min)</span></div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
