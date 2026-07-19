"use client";

import {  useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { 
    Users, Clock, Building2, TrendingUp, Zap, Server, 
    BarChart3, Activity, Download, ChevronRight, LayoutDashboard,
    AlertCircle, CheckCircle2, TrendingDown, Star, Sparkles, Lightbulb,
    UserMinus, UserCheck, Target, Layers, FileText, FileSpreadsheet, ChevronDown, UsersRound, BarChart2, Trophy, User, Boxes, X, ArrowRight, Info
} from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useBranchFilter } from "@/context/BranchFilterContext";
import DateRangeFilter, { DateRange } from "@/components/organization-admin/DateRangeFilter";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Area, AreaChart,
    BarChart, Bar, ComposedChart, ReferenceLine, Cell, PieChart, Pie
} from "recharts";

export default function AnalyticsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState<DateRange>({ start_date: null, end_date: null, preset: "today" });
    
    // Pagination states
    const ITEMS_PER_PAGE = 5;
    const [branchPage, setBranchPage] = useState(1);
    const [queuePage, setQueuePage] = useState(1);

    // Extract Guest Distribution Helpers
    const sizeColors: Record<string, string> = {
        '1': '#6366f1', // indigo-500
        '2': '#10b981', // emerald-500
        '3': '#0ea5e9', // sky-500
        '4': '#f59e0b', // amber-500
        '5': '#f43f5e', // rose-500
        '6': '#8b5cf6', // violet-500
        '7': '#ec4899', // pink-500
        '8': '#14b8a6', // teal-500
        '9': '#84cc16', // lime-500
        '10': '#eab308', // yellow-500
        'Other': '#94a3b8' // slate-400
    };
    
    const getColorForSize = (size: string) => {
        return sizeColors[size] || '#64748b'; // slate-500 fallback
    };

    const sizeLabel = (size: string) => {
        if (size === 'Other') return "Other Sizes";
        const num = parseInt(size);
        if (num === 1) return "1 Person";
        return `${size} People`;
    };

    const renderSizeIcon = (size: string) => {
        if (size === 'Other') return <Boxes size={14} color={getColorForSize(size)} />;
        const num = parseInt(size);
        if (num === 1) return <User size={14} color={getColorForSize(size)} />;
        if (num === 2) return <Users size={14} color={getColorForSize(size)} />;
        return <UsersRound size={14} color={getColorForSize(size)} />;
    };

    const timeToSeconds = (timeStr: string | null) => {
        if (!timeStr || timeStr === "—" || timeStr === "-") return 0;
        if (timeStr.includes('m') || timeStr.includes('s') || timeStr.includes('h')) {
            let secs = 0;
            const hMatch = timeStr.match(/(\d+)h/);
            const mMatch = timeStr.match(/(\d+)m/);
            const sMatch = timeStr.match(/(\d+)s/);
            if (hMatch) secs += parseInt(hMatch[1]) * 3600;
            if (mMatch) secs += parseInt(mMatch[1]) * 60;
            if (sMatch) secs += parseInt(sMatch[1]);
            return secs;
        }
        const parts = timeStr.split(':').map(Number);
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        return 0;
    };

    const humanTime = (timeStr: string | null) => {
        if (!timeStr || timeStr === "—" || timeStr === "-") return "—";
        const secs = timeToSeconds(timeStr);
        if (secs === 0 && !timeStr.includes("0")) return "—";
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m ${s}s`;
    };

    let paddedPax: any[] = [];
    let totalTokens = 0;
    let totalGuests = 0;
    
    if (data && data.pax_analytics) {
        // First, calculate totals
        data.pax_analytics.forEach((p: any) => {
            totalTokens += p.token_count;
            totalGuests += p.total_pax || 0;
        });

        // Sort by volume descending to find top 5
        const sortedByVolume = [...data.pax_analytics].sort((a: any, b: any) => b.token_count - a.token_count);
        
        const top5 = sortedByVolume.slice(0, 5);
        const others = sortedByVolume.slice(5);

        // Re-sort the top 5 numerically so they appear in a logical order (e.g. 1, 2, 4, 8)
        top5.sort((a: any, b: any) => (parseInt(a.group_size) || 0) - (parseInt(b.group_size) || 0));

        paddedPax = [...top5];

        // If there is a long tail, aggregate it into "Other Sizes"
        if (others.length > 0) {
            const othersTokenCount = others.reduce((sum, item) => sum + item.token_count, 0);
            const othersTotalPax = others.reduce((sum, item) => sum + (item.total_pax || 0), 0);
            
            // Weighted average for wait and service times
            const calcWeightedAvg = (items: any[], timeKey: string) => {
                let totalSecs = 0;
                items.forEach(item => {
                    totalSecs += timeToSeconds(item[timeKey]) * item.token_count;
                });
                const avgSecs = othersTokenCount > 0 ? Math.round(totalSecs / othersTokenCount) : 0;
                
                // Format back to mm:ss string
                const mins = Math.floor(avgSecs / 60);
                const secs = avgSecs % 60;
                return `${mins}m ${secs}s`; // Simulating the human readable format
            };

            paddedPax.push({
                group_size: 'Other',
                token_count: othersTokenCount,
                total_pax: othersTotalPax,
                avg_wait_time: calcWeightedAvg(others, 'avg_wait_time'),
                avg_service_time: calcWeightedAvg(others, 'avg_service_time'),
                breakdown: others // Keep the raw data for the tooltip
            });
        }
    }



    const maxWaitSeconds = Math.max(...paddedPax.map(p => timeToSeconds(p.avg_wait_time)), 1);
    const maxPlaySeconds = Math.max(...paddedPax.map(p => timeToSeconds(p.avg_service_time)), 1);

    const [staffPage, setStaffPage] = useState(1);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const [selectedGuestGroup, setSelectedGuestGroup] = useState<any | null>(null);

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
            link.setAttribute('download', `q4queue_analytics_${new Date().toISOString().split('T')[0]}.xlsx`);
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
        <div className="space-y-6 pb-20 print:h-auto print:overflow-visible print:pb-0 print:space-y-0 print:bg-white print:w-full">
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
                                        {/* <button
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
                                        </button> */}
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
                <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] p-7">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2.5">
                            <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600">
                                <Activity size={16} />
                            </div>
                            <h2 className="font-bold text-slate-800 text-[15px] tracking-tight">Efficiency Metrics</h2>
                        </div>
                        <span className="bg-slate-50 text-slate-500 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-slate-100">Average</span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-8 gap-x-6">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-slate-500 cursor-help w-max" title="Average duration customers wait before being served.">
                                <Clock size={14} className="text-slate-400" />
                                <span className="text-xs font-semibold text-slate-500">Wait Time</span>
                            </div>
                            <span className="text-[26px] font-black text-slate-800 tracking-tighter leading-none">{humanTime(data.time_metrics.avg_wait_time)}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-slate-500 cursor-help w-max" title="Average time staff spends serving each customer.">
                                <Zap size={14} className="text-amber-500/80" />
                                <span className="text-xs font-semibold text-slate-500">Service Time</span>
                            </div>
                            <span className="text-[26px] font-black text-slate-800 tracking-tighter leading-none">{humanTime(data.time_metrics.avg_service_time)}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-slate-500 cursor-help w-max" title="Percentage of queued customers successfully served.">
                                <CheckCircle2 size={14} className="text-emerald-500/80" />
                                <span className="text-xs font-semibold text-slate-500">Completion</span>
                            </div>
                            <span className="text-[26px] font-black text-slate-800 tracking-tighter leading-none">{data.customer_metrics.completion_rate}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-slate-500 cursor-help w-max" title="Total number of queue lanes active in this period.">
                                <Layers size={14} className="text-blue-500/80" />
                                <span className="text-xs font-semibold text-slate-500">
                                    {dateRange.preset === "today" ? "Live Queues" : "Queues"}
                                </span>
                            </div>
                            <span className="text-[26px] font-black text-slate-800 tracking-tighter leading-none">
                                {dateRange.preset === "today" ? data.operations_metrics.active_queues : data.operations_metrics.operated_queues}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Volume Focus */}
                <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] p-7">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2.5">
                            <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600">
                                <Users size={16} />
                            </div>
                            <h2 className="font-bold text-slate-800 text-[15px] tracking-tight">Volume & Scale</h2>
                        </div>
                        <span className="bg-slate-50 text-slate-500 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-slate-100">Total</span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-8 gap-x-6">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-slate-500 cursor-help w-max" title="Overall number of customers fully processed.">
                                <Users size={14} className="text-emerald-500/80" />
                                <span className="text-xs font-semibold text-slate-500">Served</span>
                            </div>
                            <span className="text-[26px] font-black text-emerald-600 tracking-tighter leading-none">{data.customer_metrics.customers_served}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-slate-500 cursor-help w-max" title="Current volume of customers still in queue.">
                                <Activity size={14} className="text-indigo-500/80" />
                                <span className="text-xs font-semibold text-slate-500">Waiting</span>
                            </div>
                            <span className="text-[26px] font-black text-indigo-600 tracking-tighter leading-none">{data.customer_metrics.customers_waiting}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-slate-500 cursor-help w-max" title="The busiest hour by customer volume.">
                                <TrendingUp size={14} className="text-rose-500/80" />
                                <span className="text-xs font-semibold text-slate-500">Peak Hour</span>
                            </div>
                            <span className="text-[20px] font-black text-rose-600 tracking-tighter leading-tight max-w-[120px]">{data.time_metrics.peak_hour}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-slate-500 cursor-help w-max" title="Number of active branches generating data.">
                                <Building2 size={14} className="text-slate-700/80" />
                                <span className="text-xs font-semibold text-slate-500">Branches</span>
                            </div>
                            <span className="text-[26px] font-black text-slate-800 tracking-tighter leading-none">{data.operations_metrics.active_branches}</span>
                        </div>
                    </div>
                </div>

                {/* Retention & Load */}
                <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] p-7 md:col-span-2 xl:col-span-1">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2.5">
                            <div className="bg-rose-50 p-2 rounded-xl text-rose-600">
                                <TrendingDown size={16} />
                            </div>
                            <h2 className="font-bold text-slate-800 text-[15px] tracking-tight">Retention & Load</h2>
                        </div>
                        <span className="bg-rose-50 text-rose-600 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-rose-100">Critical</span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-8 gap-x-6">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-slate-500 cursor-help w-max" title="Customers who left the queue without service.">
                                <UserMinus size={14} className="text-rose-400" />
                                <span className="text-xs font-semibold text-slate-500">Abandoned</span>
                            </div>
                            <span className="text-[26px] font-black text-rose-600 tracking-tighter leading-none">{data.customer_metrics.customers_abandoned}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-slate-500 cursor-help w-max" title="Percentage ratio of abandoned customers.">
                                <TrendingDown size={14} className="text-rose-400" />
                                <span className="text-xs font-semibold text-slate-500">Churn Rate</span>
                            </div>
                            <span className="text-[26px] font-black text-rose-600 tracking-tighter leading-none">{data.customer_metrics.abandonment_rate}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-slate-500 cursor-help w-max" title="Number of staff members currently on shift.">
                                <UserCheck size={14} className="text-emerald-500/80" />
                                <span className="text-xs font-semibold text-slate-500">Staff Online</span>
                            </div>
                            <span className="text-[26px] font-black text-slate-800 tracking-tighter leading-none">{data.operations_metrics.online_staff}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-slate-500 cursor-help w-max" title="Average waiting customers per online staff member.">
                                <Target size={14} className="text-indigo-500/80" />
                                <span className="text-xs font-medium border-b border-dashed border-slate-300">Load / Staff</span>
                            </div>
                            <span className="text-2xl font-semibold text-slate-900 tracking-tight">
                                {data.operations_metrics.online_staff > 0 ? (data.customer_metrics.customers_waiting / data.operations_metrics.online_staff).toFixed(1) : "-"}
                            </span>
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

            {/* Guest Distribution (Full Width) */}
            <div className="bg-white rounded-[20px] border border-slate-200/80 shadow-sm overflow-hidden flex flex-col mb-6 mt-6">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex flex-col gap-1">
                        <h2 className="font-bold text-slate-900 flex items-center gap-2">
                            <UsersRound size={20} className="text-indigo-500" />
                            Customer Group Sizes
                            <div className="relative group/info flex items-center ml-1">
                                <Info size={14} className="text-slate-400 cursor-help" />
                                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-max px-3 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none z-50">
                                    Total customer count includes the person who took the ticket.
                                </div>
                            </div>
                        </h2>
                        <p className="text-[13px] font-medium text-slate-500">See how many people are arriving alone, in pairs, or in larger groups.</p>
                    </div>
                </div>
                <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                    {/* Left Side: Visual Pie Chart (Hero) - 35% Width */}
                    <div className="w-full lg:w-[35%] p-8 flex flex-col items-center justify-center bg-slate-50/20">
                        <div className="w-full h-[280px]">
                            {totalTokens === 0 ? (
                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                                    <UsersRound size={32} className="mb-2 opacity-20" />
                                    No guest data available
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={paddedPax.filter((d: any) => d.token_count > 0)}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={80}
                                            outerRadius={105}
                                            paddingAngle={3}
                                            dataKey="token_count"
                                            cornerRadius={4}
                                            stroke="none"
                                            isAnimationActive={true}
                                            animationBegin={100}
                                            animationDuration={800}
                                        >
                                            {paddedPax.filter((d: any) => d.token_count > 0).map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={getColorForSize(entry.group_size)} />
                                            ))}
                                        </Pie>
                                        <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="text-6xl font-black fill-slate-800" style={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
                                            {totalGuests}
                                        </text>
                                        <text x="50%" y="61%" textAnchor="middle" dominantBaseline="middle" className="text-[12px] font-bold fill-slate-400 uppercase tracking-widest">
                                            Total People
                                        </text>
                                        <RechartsTooltip 
                                            cursor={false}
                                            content={({ active, payload }: any) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className="bg-white/95 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.08)] min-w-[220px]">
                                                            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-100/80">
                                                                <div className="w-3.5 h-3.5 rounded-full border shadow-sm" style={{ backgroundColor: getColorForSize(data.group_size), borderColor: `${getColorForSize(data.group_size)}40` }}></div>
                                                                <span className="font-bold text-slate-900 text-[14px] leading-none">{sizeLabel(data.group_size)}</span>
                                                            </div>
                                                            <div className="flex flex-col gap-2.5">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-slate-500 text-[12px] font-medium tracking-wide">Tokens</span>
                                                                    <div className="flex items-baseline gap-1.5">
                                                                        <span className="font-black text-slate-800 text-[14px] leading-none">{data.token_count}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-slate-500 text-[12px] font-medium tracking-wide">Total People</span>
                                                                    <div className="flex items-baseline gap-1.5">
                                                                        <span className="font-black text-slate-800 text-[14px] leading-none">{data.total_pax}</span>
                                                                    </div>
                                                                </div>
                                                                
                                                                {/* Dynamic Breakdown for "Other Sizes" */}
                                                                {data.breakdown && data.breakdown.length > 0 && (
                                                                    <div className="mt-2 pt-2 border-t border-slate-100 border-dashed">
                                                                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-2">Breakdown</span>
                                                                        <div className="flex flex-col gap-1.5 max-h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                                                                            {data.breakdown.map((b: any, i: number) => (
                                                                                <div key={i} className="flex items-center justify-between">
                                                                                    <span className="text-slate-600 text-[11px] font-medium">{sizeLabel(b.group_size)}</span>
                                                                                    <span className="text-slate-800 text-[11px] font-bold">{b.token_count} <span className="text-slate-400 text-[9px] font-medium ml-0.5">tkns</span></span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Right Side: The Metric Grid - 65% Width */}
                    <div className="w-full lg:w-[65%] p-8 bg-white flex items-center justify-center">
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
                            {paddedPax.map((item: any, idx: number) => {
                                const guestPct = totalGuests > 0 && item.total_pax > 0 ? Math.round((item.total_pax / totalGuests) * 100) : 0;
                                
                                return (
                                    <div 
                                        key={idx} 
                                        onClick={() => setSelectedGuestGroup({ ...item, guestPct })}
                                        className="flex flex-col p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 hover:bg-slate-50/50 cursor-pointer transition-colors bg-white animate-in slide-in-from-bottom-2 duration-500 group" 
                                        style={{ animationDelay: `${idx * 100}ms` }}
                                    >
                                        {/* Header: Icon + Name */}
                                        <div className="flex items-center gap-3.5 mb-5">
                                            <div className="w-10 h-10 rounded-full border flex items-center justify-center shrink-0" style={{ backgroundColor: `${getColorForSize(item.group_size)}15`, borderColor: `${getColorForSize(item.group_size)}30` }}>
                                                {renderSizeIcon(item.group_size)}
                                            </div>
                                            <span className="text-[14px] font-bold text-slate-900 leading-tight">{sizeLabel(item.group_size)}</span>
                                        </div>

                                        {/* Primary Metric: Tokens */}
                                        <div className="flex flex-col mb-4">
                                            <div className="flex items-baseline gap-2 mb-2">
                                                <span className="text-[32px] font-black text-slate-800 leading-none tracking-tight">{item.token_count}</span>
                                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-none">Tokens</span>
                                            </div>
                                        </div>

                                        <div className="mt-auto flex items-center justify-start">
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50/80 px-2.5 py-1.5 rounded-lg border border-indigo-100/50 uppercase tracking-widest group-hover:bg-indigo-100/80 transition-colors">
                                                View Details
                                                <ArrowRight size={10} strokeWidth={2.5} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Complex Tables Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                
                {/* Cross-Branch Wait Time Benchmark */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-transparent">
                        <h2 className="font-bold text-slate-800 text-[15px] flex items-center gap-2.5">
                            <div className="bg-indigo-50 p-1.5 rounded-lg text-indigo-600">
                                <BarChart3 size={15} />
                            </div>
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
                <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-transparent">
                        <h2 className="font-bold text-slate-800 text-[15px] flex items-center gap-2.5">
                            <div className="bg-indigo-50 p-1.5 rounded-lg text-indigo-600">
                                <LayoutDashboard size={15} />
                            </div>
                            Top Queues by Volume
                        </h2>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left text-[13px] whitespace-nowrap">
                            <thead className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">
                                <tr>
                                    <th className="py-4 px-6">Queue Name</th>
                                    <th className="py-4 px-6">Branch</th>
                                    <th className="py-4 px-6 text-right">Served</th>
                                    <th className="py-4 px-6 text-right">Avg Wait</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {data.queue_analytics.length === 0 ? (
                                    <tr><td colSpan={4} className="py-8 px-4 text-center text-slate-400">No queues found</td></tr>
                                ) : (
                                    <>
                                        {data.queue_analytics.slice((queuePage - 1) * ITEMS_PER_PAGE, queuePage * ITEMS_PER_PAGE).map((item: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors cursor-pointer group">
                                                <td className="py-4 px-6 font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">{item.queue_name}</td>
                                                <td className="py-4 px-6 text-slate-500 font-medium">{item.branch}</td>
                                                <td className="py-4 px-6 text-right font-bold text-slate-700">{item.customers_served}</td>
                                                <td className="py-4 px-6 text-right font-semibold text-slate-500">
                                                    <span className="bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md text-xs">{humanTime(item.avg_wait_time)}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {data.queue_analytics.length > ITEMS_PER_PAGE && (
                        <div className="p-4 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between">
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
                <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-transparent">
                        <h2 className="font-bold text-slate-800 text-[15px] flex items-center gap-2.5">
                            <div className="bg-emerald-50 p-1.5 rounded-lg text-emerald-600">
                                <Users size={15} />
                            </div>
                            Top Performing Staff
                        </h2>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left text-[13px] whitespace-nowrap">
                            <thead className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">
                                <tr>
                                    <th className="py-4 px-6">Staff Name</th>
                                    <th className="py-4 px-6">Branch</th>
                                    <th className="py-4 px-6 text-right">Served</th>
                                    <th className="py-4 px-6 text-right">Avg Service</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
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
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors cursor-pointer group">
                                                <td className="py-4 px-6 font-semibold text-slate-800 flex items-center gap-2.5 group-hover:text-emerald-600 transition-colors">
                                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 uppercase">
                                                        {item.staff_name.substring(0,2)}
                                                    </div>
                                                    {item.staff_name}
                                                </td>
                                                <td className="py-4 px-6 text-slate-500 font-medium">{item.branch}</td>
                                                <td className="py-4 px-6 text-right font-bold text-emerald-600">{item.customers_served}</td>
                                                <td className="py-4 px-6 text-right font-semibold text-slate-600">
                                                    <span className="bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md text-xs">{humanTime(item.avg_service_time)}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {data.staff_performance.length > ITEMS_PER_PAGE && (
                        <div className="p-4 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between">
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

                {/* Peak Traffic Chart */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] overflow-hidden lg:col-span-2 flex flex-col">
                    <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-transparent">
                        <h2 className="font-bold text-slate-800 text-[15px] flex items-center gap-2.5">
                            <div className="bg-indigo-50 p-1.5 rounded-lg text-indigo-600">
                                <TrendingUp size={15} />
                            </div>
                            Traffic Volume by Hour
                        </h2>
                    </div>
                    <div className="p-6 h-[350px] w-full">
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
                                        formatter={(value, name) => {
                                            if (name === "Avg Wait (min)") return [`${value} min`, name];
                                            return [value, name];
                                        }}
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

            {/* Guest Distribution Detail Modal */}
            {selectedGuestGroup && (
                <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-lg flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="relative bg-white/95 backdrop-blur-xl rounded-[28px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] w-full max-w-[380px] overflow-hidden animate-in zoom-in-95 duration-300 ring-1 ring-slate-200/50">
                        
                        {/* Floating Close Button */}
                        <button 
                            onClick={() => setSelectedGuestGroup(null)}
                            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100/80 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors z-10"
                        >
                            <X size={16} strokeWidth={2.5} />
                        </button>

                        {/* Minimalist Header */}
                        <div className="px-7 pt-8 pb-6 flex flex-col items-center justify-center text-center">
                            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 shadow-sm" style={{ backgroundColor: `${getColorForSize(selectedGuestGroup.group_size)}15`, color: getColorForSize(selectedGuestGroup.group_size) }}>
                                {renderSizeIcon(selectedGuestGroup.group_size)}
                            </div>
                            <span className="text-xl font-black text-slate-900 tracking-tight leading-none mb-1">{sizeLabel(selectedGuestGroup.group_size)}</span>
                            <span className="text-[13px] font-medium text-slate-500">Group Size Details</span>
                        </div>
                        
                        {/* Content */}
                        <div className="px-7 pb-8">
                            {/* Borderless Hero Stats */}
                            <div className="flex items-center justify-center gap-8 mb-8">
                                <div className="flex flex-col items-center">
                                    <span className="text-[34px] font-black text-slate-800 leading-none tracking-tighter mb-1">{selectedGuestGroup.token_count}</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tokens</span>
                                </div>
                                <div className="w-px h-10 bg-slate-200"></div>
                                <div className="flex flex-col items-center">
                                    <span className="text-[34px] font-black text-slate-800 leading-none tracking-tighter mb-1">{selectedGuestGroup.total_pax}</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-help border-b border-dashed border-slate-300" title="Total headcount (includes the primary token holder)">Total People</span>
                                </div>
                            </div>

                            {/* Grid Service Times */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 rounded-2xl p-4 flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-amber-500">
                                        <Clock size={14} />
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Wait</span>
                                    </div>
                                    <span className="font-black text-lg text-slate-800 tracking-tight">{humanTime(selectedGuestGroup.avg_wait_time)}</span>
                                </div>
                                <div className="bg-slate-50 rounded-2xl p-4 flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-indigo-500">
                                        <Zap size={14} />
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Service</span>
                                    </div>
                                    <span className="font-black text-lg text-slate-800 tracking-tight">{humanTime(selectedGuestGroup.avg_service_time)}</span>
                                </div>
                            </div>

                            {/* Composition Breakdown */}
                            {selectedGuestGroup.breakdown && selectedGuestGroup.breakdown.length > 0 && (
                                <div className="mt-8 pt-6 border-t border-slate-100/80">
                                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest block mb-4">Composition Breakdown</span>
                                    <div className="flex flex-col max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                                        {selectedGuestGroup.breakdown.map((b: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0 group animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-indigo-400 transition-colors"></div>
                                                    <span className="text-slate-600 text-[13px] font-semibold">{sizeLabel(b.group_size)}</span>
                                                </div>
                                                <span className="text-slate-800 text-[13px] font-black">{b.token_count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
