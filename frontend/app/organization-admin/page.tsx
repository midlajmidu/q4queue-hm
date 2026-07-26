"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useBranchFilter } from "@/context/BranchFilterContext";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
    ActivitySquare, Building2, Clock, 
    Zap, Users, Timer, Activity, Sparkles, 
    AlertCircle, CheckCircle2, Info, ShieldCheck, MessageCircle, ExternalLink,
    TrendingUp, Shield, BarChart3, ChevronRight, UserCog, ArrowUpDown, MoreHorizontal, UserCheck, Trophy
} from "lucide-react";
import Link from "next/link";
import GlobalActivityFeed from "@/components/organization-admin/GlobalActivityFeed";
import { PremiumCard } from "@/components/ui/PremiumCard";
import { MetricCard } from "@/components/ui/MetricCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import BranchSelector from "@/components/organization-admin/BranchSelector";
import TrafficChart from "@/components/organization-admin/TrafficChart";

import TableSparkline from "@/components/organization-admin/TableSparkline";

interface DashboardMetricsResponse {
    organization_name: string;
    global_kpis: any;
    dynamic_insights: any;
    executive_insights: any;
    whatsapp_overview: any;
    branch_health: any;
    alerts: any[];
    branch_performance: any[];
}

export default function OrgAdminDashboard() {
    const [data, setData] = useState<DashboardMetricsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [timeAgo, setTimeAgo] = useState<string>("just now");

    const { selectedBranchId } = useBranchFilter();

    useEffect(() => {
        const loadData = async () => {
            try {
                const dashRes = await api.getOrgAdminDashboard(selectedBranchId || undefined);
                setData(dashRes);
                setLastUpdated(new Date());
                setLoading(false);
            } catch (err: any) {
                toast.error(err.detail || "Failed to load dashboard");
                setLoading(false);
            }
        };

        loadData();
        const interval = setInterval(loadData, 15000);
        return () => clearInterval(interval);
    }, [selectedBranchId]);

    useEffect(() => {
        const interval = setInterval(() => {
            const seconds = Math.floor((new Date().getTime() - lastUpdated.getTime()) / 1000);
            if (seconds < 10) setTimeAgo("just now");
            else if (seconds < 60) setTimeAgo(`${seconds}s ago`);
            else setTimeAgo(`${Math.floor(seconds/60)}m ago`);
        }, 5000);
        return () => clearInterval(interval);
    }, [lastUpdated]);

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            
            {/* Premium Header & Controls */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-6 pb-6 border-b border-slate-200/60">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500">
                        Command Center
                    </h1>
                    <div className="flex items-center flex-wrap gap-2.5 text-sm text-slate-500 mt-2">
                        <span className="leading-none font-medium text-slate-500">Real-time enterprise overview for {data.organization_name}.</span>
                    </div>
                </div>
            </div>

            {/* 1. Executive Overview */}
            <section>
                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-slate-900">Executive Overview</h2>
                    <p className="text-sm text-slate-500 mt-1">Key metrics and enterprise health across all branches.</p>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
                    {/* Total Staff Card (Replaced Org Health) */}
                    <MetricCard 
                        title="Total Staff"
                        value={data.global_kpis.total_staff}
                        subtitle={`${data.global_kpis.active_staff || 0} active right now`}
                        icon={UserCog}
                        watermarkIcon={UserCog}
                        iconColor="emerald"
                    />

                    {/* Total Admins Card */}
                    <MetricCard 
                        title="Total Admins"
                        value={data.global_kpis.total_branch_admins}
                        subtitle="Branch administrators"
                        icon={Shield}
                        watermarkIcon={Shield}
                        iconColor="indigo"
                    />

                    <MetricCard 
                        title="Total Branches"
                        value={data.global_kpis.total_branches}
                        subtitle={`${data.global_kpis.active_branches} currently active`}
                        icon={Building2}
                        watermarkIcon={Building2}
                        iconColor="sky"
                    />
                    
                    <MetricCard 
                        title="Global Waiting"
                        value={data.global_kpis.total_customers_waiting}
                        subtitle="vs yesterday average"
                        icon={Clock}
                        watermarkIcon={Clock}
                        trend={data.global_kpis.waiting_trend_direction as any}
                        trendValue={data.global_kpis.waiting_trend_value}
                        iconColor="amber"
                    />
                    
                    <div className="col-span-2 lg:col-span-1">
                        <MetricCard 
                            title="Served Today"
                            value={data.global_kpis.total_customers_served_today}
                            subtitle="vs yesterday"
                            icon={UserCheck}
                            watermarkIcon={UserCheck}
                            trend={data.global_kpis.served_trend_direction as any}
                            trendValue={data.global_kpis.served_trend_value}
                            iconColor="teal"
                        />
                    </div>
                </div>
            </section>

            {/* Branch Filter for insights below */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-4 border-t border-slate-200/60">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Branch Insights</h2>
                    <p className="text-sm text-slate-500 mt-1">Filter live operations and traffic by specific branch.</p>
                </div>
                <div className="shrink-0">
                    <BranchSelector />
                </div>
            </div>

            {/* Traffic Visualization */}
            <TrafficChart />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                {/* Left Column: Live Ops & Insights (2/3 width) */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* 2. Today's Operations */}
                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Today's Operations</h2>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-100 shadow-sm">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-blue-700">Daily Summary</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Total Visitors Today */}
                            <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between h-full group hover:border-slate-300 transition-colors">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-medium text-slate-600">Total Visitors Today</h3>
                                    <div className="text-slate-400 group-hover:text-slate-900 transition-colors">
                                        <Users size={16} strokeWidth={2} />
                                    </div>
                                </div>
                                <div>
                                    <span className="text-2xl font-bold tracking-tight text-slate-900">{data.dynamic_insights.total_visitors_today}</span>
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="text-[11px] text-slate-500">Total joined queue today</span>
                                    </div>
                                </div>
                            </div>

                            {/* Customers Served Today */}
                            <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between h-full group hover:border-slate-300 transition-colors">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-medium text-slate-600">Customers Served</h3>
                                    <div className="text-slate-400 group-hover:text-slate-900 transition-colors">
                                        <UserCheck size={16} strokeWidth={2} />
                                    </div>
                                </div>
                                <div>
                                    <span className="text-2xl font-bold tracking-tight text-slate-900">{data.dynamic_insights.total_served_today}</span>
                                    <div className="mt-2 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] text-slate-500">Successfully completed today</span>
                                        </div>
                                    </div>
                                    {/* Completion Progress Bar */}
                                    <div className="mt-3.5 w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-slate-900 rounded-full transition-all duration-1000" 
                                            style={{ width: `${data.dynamic_insights.total_visitors_today > 0 ? Math.min(100, (data.dynamic_insights.total_served_today / data.dynamic_insights.total_visitors_today) * 100) : 0}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>

                            {/* Avg Wait Time */}
                            {(() => {
                                const waitStr = String(data.dynamic_insights.average_wait_time || "0");
                                const waitNum = parseInt(waitStr.replace(/[^0-9]/g, '')) || 0;
                                const bgClass = waitNum >= 15 ? "bg-rose-50/50 border-rose-100" : waitNum >= 12 ? "bg-amber-50/50 border-amber-100" : "bg-slate-50/50 border-slate-200";
                                const textClass = waitNum >= 15 ? "text-rose-600" : waitNum >= 12 ? "text-amber-600" : "text-slate-900";
                                
                                return (
                                    <div className={`${bgClass} rounded-xl p-5 border shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between h-full group transition-colors`}>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-medium text-slate-600">Avg Wait Time</h3>
                                            <div className="text-slate-400 group-hover:text-slate-900 transition-colors">
                                                <Timer size={16} strokeWidth={2} />
                                            </div>
                                        </div>
                                        <div>
                                            <span className={`text-2xl font-bold tracking-tight transition-colors ${textClass}`}>
                                                {data.dynamic_insights.average_wait_time}
                                            </span>
                                            <div className="mt-2.5">
                                                <span className="text-[11px] text-slate-500">Benchmark: 15m</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Avg Service Time */}
                            {(() => {
                                const servStr = String(data.dynamic_insights.average_service_time || "0");
                                const servNum = parseInt(servStr.replace(/[^0-9]/g, '')) || 0;
                                const bgClass = servNum >= 10 ? "bg-rose-50/50 border-rose-100" : servNum >= 8 ? "bg-amber-50/50 border-amber-100" : "bg-slate-50/50 border-slate-200";
                                const textClass = servNum >= 10 ? "text-rose-600" : servNum >= 8 ? "text-amber-600" : "text-slate-900";
                                
                                return (
                                    <div className={`${bgClass} rounded-xl p-5 border shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between h-full group transition-colors`}>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-medium text-slate-600">Avg Service Time</h3>
                                            <div className="text-slate-400 group-hover:text-slate-900 transition-colors">
                                                <Activity size={16} strokeWidth={2} />
                                            </div>
                                        </div>
                                        <div>
                                            <span className={`text-2xl font-bold tracking-tight transition-colors ${textClass}`}>
                                                {data.dynamic_insights.average_service_time}
                                            </span>
                                            <div className="mt-2.5">
                                                <span className="text-[11px] text-slate-500">Benchmark: 10m</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </section>


                </div>

                {/* Right Column: Global Activity */}
                <div className="lg:col-span-1 relative min-h-[460px] lg:min-h-0">
                    <div className="lg:absolute lg:inset-0 w-full h-full">
                        <section className="h-full flex flex-col">
                            <SectionHeader title="Recent Activity" />
                            <div className="flex-1 min-h-0 h-full">
                                <GlobalActivityFeed />
                            </div>
                        </section>
                    </div>
                </div>
            </div>

            {/* 4. Branch Performance */}
            <section>
                <SectionHeader title="Live Branch Performance" />
                
                {data.branch_performance.length === 0 ? (
                    <EmptyState 
                        icon={Building2}
                        title="No branches available"
                        description="There is no active branch data matching the current filter. Try selecting a different branch or 'All Branches'."
                    />
                ) : (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 border-b border-slate-200/80">
                                    <tr>
                                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-widest text-left">
                                        Branch
                                    </th>
                                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-widest text-left">Status</th>
                                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-widest text-right">Sessions</th>
                                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-widest text-right">
                                        Waiting
                                    </th>
                                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-widest text-right">
                                        Currently Serving
                                    </th>
                                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-widest text-right">
                                        Served
                                    </th>
                                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-widest text-right">Avg Wait</th>
                                    <th className="px-4 py-2.5 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {[...data.branch_performance]
                                    .sort((a, b) => b.waiting_customers - a.waiting_customers)
                                    .slice(0, 10)
                                    .map((b) => {
                                    const hasAlert = b.name === data.executive_insights?.busiest_branch;
                                    const isTopPerformer = b.name === data.executive_insights?.top_performing_branch;
                                    const rowBg = hasAlert ? 'bg-rose-50/40 hover:bg-rose-50/80' : isTopPerformer ? 'bg-amber-50/40 hover:bg-amber-50/80' : 'hover:bg-slate-50/80';
                                    
                                    return (
                                    <tr key={b.id} className={`${rowBg} transition-colors group border-b border-slate-100 last:border-0`}>
                                        <td className="px-4 py-3 text-left">
                                            <p className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors cursor-pointer">{b.name}</p>
                                        </td>
                                        <td className="px-4 py-3 text-left">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${b.status === 'Active' ? 'bg-emerald-100/80 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${b.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                                {b.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-700">{b.active_sessions}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <span key={`wait-${b.waiting_customers}`} className={`font-bold text-sm animate-in fade-in duration-500 ${b.waiting_customers > 10 ? 'text-rose-600' : b.waiting_customers > 5 ? 'text-amber-600' : 'text-slate-800'}`}>{b.waiting_customers}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <span key={`serving-${b.serving_customers}`} className="font-bold text-sm text-slate-800 animate-in fade-in duration-500">{b.serving_customers}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <span key={`served-${b.customers_served_today}`} className="font-bold text-sm text-slate-800 animate-in fade-in duration-500">{b.customers_served_today}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-600">{b.avg_wait_time}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Link
                                                    href={`/organization-admin/branches/${b.id}`}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 bg-white hover:bg-slate-50 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-md transition-all shadow-sm"
                                                >
                                                    <ExternalLink size={14} strokeWidth={2.5} />
                                                    Dashboard
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {data.branch_performance.length > 10 && (
                            <div className="border-t border-slate-100 bg-slate-50/50 p-3 flex justify-center">
                                <Link href="/organization-admin/branches" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors">
                                    View all {data.branch_performance.length} branches <ChevronRight size={16} />
                                </Link>
                            </div>
                        )}
                        </div>
                    </div>
                )}
            </section>

        </div>
    );
}
