"use client";

import {  useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { 
    Users, Clock, Building2, TrendingUp, Zap, Server, 
    BarChart3, Activity, Download, ChevronRight, LayoutDashboard,
    AlertCircle, CheckCircle2, TrendingDown, Star, Sparkles,
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
                    <h1 className="text-[22px] font-extrabold tracking-tight text-slate-900">
                        Executive Dashboard
                    </h1>
                    <div className="flex items-center flex-wrap gap-2.5 mt-1.5">
                        <span className="text-[13px] font-medium text-slate-500">Operational insights & performance metrics</span>
                        <span className="hidden sm:flex items-center text-slate-300 leading-none">·</span>
                        <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest uppercase font-semibold bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md border border-emerald-100/80 leading-none">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                            </span>
                            <span>Live</span>
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


            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

                {/* ── Card 1: Efficiency Metrics ── */}
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                                <Activity size={16} />
                            </div>
                            <div>
                                <h2 className="font-bold text-slate-800 text-[13px] tracking-tight leading-none">Efficiency Metrics</h2>
                                <p className="text-[10.5px] font-medium text-slate-400 mt-0.5">Averages across the period</p>
                            </div>
                        </div>
                        <span className="bg-slate-50 text-slate-500 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-slate-200/60">Avg</span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 cursor-help" title="Average duration customers wait before being served.">
                                <Clock size={11} className="text-slate-400 shrink-0" />
                                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Wait Time</span>
                            </div>
                            <span className="text-[24px] font-black text-slate-800 tracking-tighter leading-none">{humanTime(data.time_metrics.avg_wait_time)}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 cursor-help" title="Average time staff spends serving each customer.">
                                <Zap size={11} className="text-amber-400 shrink-0" />
                                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Service Time</span>
                            </div>
                            <span className="text-[24px] font-black text-slate-800 tracking-tighter leading-none">{humanTime(data.time_metrics.avg_service_time)}</span>
                        </div>

                        <div className="col-span-2 border-t border-slate-100" />

                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 cursor-help" title="Percentage of queued customers successfully served.">
                                <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Completion</span>
                            </div>
                            {(() => {
                                const val = parseFloat(data.customer_metrics.completion_rate);
                                const color = val >= 70 ? 'text-emerald-600' : val >= 40 ? 'text-amber-500' : 'text-rose-500';
                                return <span className={`text-[24px] font-black tracking-tighter leading-none ${color}`}>{data.customer_metrics.completion_rate}</span>;
                            })()}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 cursor-help" title="Total number of queue lanes active in this period.">
                                <Layers size={11} className="text-blue-400 shrink-0" />
                                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                                    {dateRange.preset === "today" ? "Live Queues" : "Queues"}
                                </span>
                            </div>
                            <span className="text-[24px] font-black text-slate-800 tracking-tighter leading-none">
                                {dateRange.preset === "today" ? data.operations_metrics.active_queues : data.operations_metrics.operated_queues}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── Card 2: Volume & Scale ── */}
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                                <Users size={16} />
                            </div>
                            <div>
                                <h2 className="font-bold text-slate-800 text-[13px] tracking-tight leading-none">Volume & Scale</h2>
                                <p className="text-[10.5px] font-medium text-slate-400 mt-0.5">Totals for the period</p>
                            </div>
                        </div>
                        <span className="bg-slate-50 text-slate-500 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-slate-200/60">Total</span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 cursor-help" title="Overall number of customers fully processed.">
                                <Users size={11} className="text-emerald-500 shrink-0" />
                                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Served</span>
                            </div>
                            <span className="text-[24px] font-black text-emerald-600 tracking-tighter leading-none">{data.customer_metrics.customers_served}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 cursor-help" title="Current volume of customers still in queue.">
                                <Activity size={11} className="text-indigo-500 shrink-0" />
                                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Waiting</span>
                            </div>
                            <span className="text-[24px] font-black text-indigo-600 tracking-tighter leading-none">{data.customer_metrics.customers_waiting}</span>
                        </div>

                        <div className="col-span-2 border-t border-slate-100" />

                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 cursor-help" title="The busiest hour by customer volume.">
                                <TrendingUp size={11} className="text-slate-400 shrink-0" />
                                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Peak Hour</span>
                            </div>
                            <span className="text-[16px] font-black text-slate-800 tracking-tight leading-snug">{data.time_metrics.peak_hour || "—"}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 cursor-help" title="Number of active branches generating data.">
                                <Building2 size={11} className="text-slate-400 shrink-0" />
                                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Branches</span>
                            </div>
                            <span className="text-[24px] font-black text-slate-800 tracking-tighter leading-none">{data.operations_metrics.active_branches}</span>
                        </div>
                    </div>
                </div>

                {/* ── Card 3: Retention & Load — dynamic severity ── */}
                {(() => {
                    const churnVal = parseFloat(data.customer_metrics.abandonment_rate);
                    const isCritical = churnVal > 30;
                    const isWarn = churnVal > 15 && churnVal <= 30;
                    const badgeLabel = isCritical ? 'Critical' : isWarn ? 'Monitor' : 'Healthy';
                    const badgeCls = isCritical
                        ? 'bg-rose-50 text-rose-600 border-rose-100'
                        : isWarn ? 'bg-amber-50 text-amber-600 border-amber-100'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-100';
                    const iconBg = isCritical ? 'bg-rose-50 text-rose-600' : isWarn ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600';
                    const churnColor = isCritical ? 'text-rose-600' : isWarn ? 'text-amber-500' : 'text-emerald-600';
                    return (
                        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-6 md:col-span-2 xl:col-span-1">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
                                        <TrendingDown size={16} />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-slate-800 text-[13px] tracking-tight leading-none">Retention & Load</h2>
                                        <p className="text-[10.5px] font-medium text-slate-400 mt-0.5">Abandonment & staffing</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${badgeCls}`}>{badgeLabel}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-1.5 cursor-help" title="Customers who left the queue without service.">
                                        <UserMinus size={11} className="text-rose-400 shrink-0" />
                                        <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Abandoned</span>
                                    </div>
                                    <span className="text-[24px] font-black text-rose-600 tracking-tighter leading-none">{data.customer_metrics.customers_abandoned}</span>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-1.5 cursor-help" title="Percentage ratio of abandoned customers.">
                                        <TrendingDown size={11} className="text-rose-400 shrink-0" />
                                        <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Churn Rate</span>
                                    </div>
                                    <span className={`text-[24px] font-black tracking-tighter leading-none ${churnColor}`}>{data.customer_metrics.abandonment_rate}</span>
                                </div>

                                <div className="col-span-2 border-t border-slate-100" />

                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-1.5 cursor-help" title="Number of staff members currently on shift.">
                                        <UserCheck size={11} className="text-emerald-500 shrink-0" />
                                        <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Staff Online</span>
                                    </div>
                                    <span className="text-[24px] font-black text-slate-800 tracking-tighter leading-none">{data.operations_metrics.online_staff}</span>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-1.5 cursor-help" title="Average waiting customers per online staff member.">
                                        <Target size={11} className="text-indigo-500 shrink-0" />
                                        <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Load / Staff</span>
                                    </div>
                                    <span className="text-[24px] font-black text-slate-800 tracking-tighter leading-none">
                                        {data.operations_metrics.online_staff > 0
                                            ? (data.customer_metrics.customers_waiting / data.operations_metrics.online_staff).toFixed(1)
                                            : "—"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })()}
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

            {/* Customer Group Sizes - Premium Redesign */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-6 mt-6">
                {/* Header */}
                <div className="px-7 py-5 border-b border-slate-100 flex items-start justify-between">
                    <div className="flex items-start gap-3.5">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100/60">
                            <UsersRound size={17} className="text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-[15px] font-bold text-slate-900 leading-tight">Customer Group Sizes</h2>
                            <p className="text-[13px] font-medium text-slate-500 mt-0.5 flex items-center gap-1.5">
                                How many people arrive alone, in pairs, or in larger groups
                                <span className="relative group/info inline-flex items-center">
                                    <Info size={12} className="text-slate-400 cursor-help" />
                                    <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-max px-3 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none z-50">
                                        Total customer count includes the person who took the ticket.
                                    </span>
                                </span>
                            </p>
                        </div>
                    </div>
                    {/* Summary badges */}
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200/80 text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">Total People</p>
                            <p className="text-[16px] font-black text-slate-800 leading-none">{totalGuests}</p>
                        </div>
                        <div className="px-3 py-1.5 bg-indigo-50 rounded-lg border border-indigo-100/60 text-center">
                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider leading-none mb-0.5">Total Tickets</p>
                            <p className="text-[16px] font-black text-indigo-700 leading-none">{totalTokens}</p>
                        </div>
                    </div>
                </div>

                {totalTokens === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                        <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-center mb-4">
                            <UsersRound size={28} className="opacity-30" />
                        </div>
                        <p className="text-[14px] font-semibold text-slate-500">No group data available</p>
                        <p className="text-[12px] text-slate-400 mt-1">Data will appear once customers start using the queue</p>
                    </div>
                ) : (
                    <div className="flex flex-col lg:flex-row">
                        {/* Left: Donut Chart + Legend */}
                        <div className="w-full lg:w-[38%] px-6 py-7 flex flex-col items-center border-b lg:border-b-0 lg:border-r border-slate-100">

                            {/* Section micro-label */}
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em] mb-5 self-start">Distribution</p>

                            {/* Donut Ring — clean, no wrapper border */}
                            <div className="w-full" style={{ height: '210px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                                        <Pie
                                            data={paddedPax.filter((d: any) => d.token_count > 0)}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={68}
                                            outerRadius={95}
                                            paddingAngle={2}
                                            dataKey="token_count"
                                            cornerRadius={4}
                                            stroke="none"
                                            isAnimationActive={true}
                                            animationBegin={60}
                                            animationDuration={650}
                                        >
                                            {paddedPax.filter((d: any) => d.token_count > 0).map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={getColorForSize(entry.group_size)} />
                                            ))}
                                        </Pie>

                                        {/* Center: big number */}
                                        <text
                                            x="50%" y="44%"
                                            textAnchor="middle" dominantBaseline="middle"
                                            style={{ fontWeight: 900, fontSize: '32px', fill: '#0f172a', letterSpacing: '-0.04em' }}
                                        >
                                            {totalGuests}
                                        </text>
                                        {/* Center: "people" label */}
                                        <text
                                            x="50%" y="57%"
                                            textAnchor="middle" dominantBaseline="middle"
                                            style={{ fontWeight: 600, fontSize: '11px', fill: '#94a3b8', letterSpacing: '0.06em' }}
                                        >
                                            people
                                        </text>
                                        {/* Center: tickets count (small indigo pill) */}
                                        <text
                                            x="50%" y="70%"
                                            textAnchor="middle" dominantBaseline="middle"
                                            style={{ fontWeight: 800, fontSize: '12px', fill: '#6366f1' }}
                                        >
                                            {totalTokens} tickets
                                        </text>

                                        <RechartsTooltip
                                            cursor={false}
                                            content={({ active, payload }: any) => {
                                                if (active && payload && payload.length) {
                                                    const d = payload[0].payload;
                                                    const pct = totalTokens > 0 ? Math.round((d.token_count / totalTokens) * 100) : 0;
                                                    const color = getColorForSize(d.group_size);
                                                    return (
                                                        <div
                                                            className="bg-white p-4 rounded-2xl border border-slate-100 min-w-[168px]"
                                                            style={{ boxShadow: `0 12px 36px -6px ${color}30, 0 4px 12px -2px rgba(0,0,0,0.08)` }}
                                                        >
                                                            {/* Header row */}
                                                            <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b border-slate-100">
                                                                <div
                                                                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                                                    style={{ backgroundColor: `${color}18` }}
                                                                >
                                                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-slate-900 text-[13px] leading-none">{sizeLabel(d.group_size)}</p>
                                                                    <p className="text-[10px] font-semibold mt-0.5" style={{ color }}>{pct}% of tickets</p>
                                                                </div>
                                                            </div>
                                                            {/* 2-col metric tiles */}
                                                            <div className="grid grid-cols-2 gap-1.5">
                                                                <div className="bg-slate-50 rounded-lg px-2.5 py-2 text-center">
                                                                    <p className="text-[17px] font-black text-slate-800 leading-none">{d.token_count}</p>
                                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">Tickets</p>
                                                                </div>
                                                                <div className="rounded-lg px-2.5 py-2 text-center" style={{ backgroundColor: `${color}12` }}>
                                                                    <p className="text-[17px] font-black leading-none" style={{ color }}>{d.total_pax}</p>
                                                                    <p className="text-[9px] font-bold uppercase tracking-wide mt-0.5" style={{ color: `${color}aa` }}>People</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Legend — clean card with mini bars */}
                            <div className="w-full mt-4 rounded-xl border border-slate-200/70 overflow-hidden bg-white shadow-sm">
                                {paddedPax.filter((d: any) => d.token_count > 0).map((item: any, idx: number, arr: any[]) => {
                                    const pct = totalTokens > 0 ? Math.round((item.token_count / totalTokens) * 100) : 0;
                                    // Ensure bar is always visible: min 6% visual width so even 1% groups show a sliver
                                    const barWidth = Math.max(pct, 6);
                                    const color = getColorForSize(item.group_size);
                                    return (
                                        <div
                                            key={idx}
                                            className={`flex items-center gap-3 px-3.5 py-2.5 ${idx < arr.length - 1 ? 'border-b border-slate-100' : ''}`}
                                        >
                                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                            <span className="text-[11.5px] font-semibold text-slate-700 shrink-0 w-[70px] truncate">{sizeLabel(item.group_size)}</span>
                                            <div className="flex-1 h-[5px] bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-700"
                                                    style={{ width: `${barWidth}%`, backgroundColor: color, opacity: pct < 6 ? 0.6 : 1 }}
                                                />
                                            </div>
                                            <span className="text-[11px] font-black shrink-0 w-8 text-right tabular-nums" style={{ color }}>{pct}%</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Right: Group Rows with Progress Bars */}
                        <div className="w-full lg:w-[62%] px-7 py-6 flex flex-col justify-center gap-1">
                            {paddedPax.map((item: any, idx: number) => {
                                const tokenPct = totalTokens > 0 && item.token_count > 0 ? Math.round((item.token_count / totalTokens) * 100) : 0;
                                const guestPct = totalGuests > 0 && item.total_pax > 0 ? Math.round((item.total_pax / totalGuests) * 100) : 0;
                                const color = getColorForSize(item.group_size);
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => setSelectedGuestGroup({ ...item, guestPct })}
                                        className="group flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-slate-50/70 cursor-pointer transition-all duration-150 border border-transparent hover:border-slate-200/60"
                                    >
                                        {/* Icon Tile */}
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-150" style={{ backgroundColor: `${color}15`, borderColor: `${color}30` }}>
                                            {renderSizeIcon(item.group_size)}
                                        </div>

                                        {/* Label + Progress */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[13px] font-bold text-slate-800">{sizeLabel(item.group_size)}</span>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-[11px] font-semibold text-slate-500">{item.total_pax} <span className="text-slate-400 font-medium">people</span></span>
                                                    <span className="text-[11px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}15`, color: color }}>{tokenPct}%</span>
                                                </div>
                                            </div>
                                            {/* Progress bar */}
                                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-700"
                                                    style={{ width: `${tokenPct}%`, backgroundColor: color }}
                                                />
                                            </div>
                                        </div>

                                        {/* Token Count */}
                                        <div className="shrink-0 text-right pl-2">
                                            <span className="text-[20px] font-black text-slate-800 leading-none block">{item.token_count}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">tickets</span>
                                        </div>

                                        {/* Chevron */}
                                        <ChevronRight size={15} className="text-slate-300 shrink-0 group-hover:text-slate-500 transition-colors" />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
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
                                    <th className="py-4 px-6">User Name</th>
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
