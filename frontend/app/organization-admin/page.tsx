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
            
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-semibold text-slate-900">Command Center</h1>
                        {!loading && data && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                                <Clock size={10} className="text-slate-400" />
                                <span className="text-[10px] font-medium text-slate-500">Updated {timeAgo}</span>
                            </div>
                        )}
                    </div>
                    <p className="text-sm text-slate-500 mt-1">Real-time enterprise overview for {data.organization_name}.</p>
                </div>
            </div>

            {/* 1. Executive Overview */}
            <section>
                <SectionHeader title="Executive Overview" />
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
                    
                    {/* 2. Live Operations */}
                    <section>
                        <div className="flex items-center gap-3 mb-6">
                            <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Live Operations</h2>
                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 shadow-sm">
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                </span>
                                <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-700">Real-time</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Active Sessions */}
                            <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between h-full group hover:border-slate-300 transition-colors">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-medium text-slate-600">Active Sessions</h3>
                                    <div className="text-slate-400 group-hover:text-slate-900 transition-colors">
                                        <Zap size={16} strokeWidth={2} />
                                    </div>
                                </div>
                                <div>
                                    <span className="text-2xl font-bold tracking-tight text-slate-900">{data.dynamic_insights.active_sessions}</span>
                                    <div className="mt-2 flex items-center gap-2">
                                        <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium ${
                                            data.dynamic_insights.sessions_trend_direction === 'up' ? 'text-emerald-700 bg-emerald-50 border border-emerald-100/50' :
                                            data.dynamic_insights.sessions_trend_direction === 'down' ? 'text-rose-700 bg-rose-50 border border-rose-100/50' :
                                            'text-slate-600 bg-slate-100 border border-slate-200'
                                        }`}>
                                            <TrendingUp size={12} strokeWidth={2} className={data.dynamic_insights.sessions_trend_direction === 'down' ? 'rotate-180' : ''} />
                                            <span>{data.dynamic_insights.sessions_trend_value}%</span>
                                        </div>
                                        <span className="text-[11px] text-slate-500">vs last hour</span>
                                    </div>
                                </div>
                            </div>

                            {/* Being Served */}
                            <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between h-full group hover:border-slate-300 transition-colors">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-medium text-slate-600">Being Served</h3>
                                    <div className="text-slate-400 group-hover:text-slate-900 transition-colors">
                                        <Users size={16} strokeWidth={2} />
                                    </div>
                                </div>
                                <div>
                                    <span className="text-2xl font-bold tracking-tight text-slate-900">{data.dynamic_insights.customers_being_served}</span>
                                    <div className="mt-2 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium ${
                                                data.dynamic_insights.serving_trend_direction === 'up' ? 'text-emerald-700 bg-emerald-50 border border-emerald-100/50' :
                                                data.dynamic_insights.serving_trend_direction === 'down' ? 'text-rose-700 bg-rose-50 border border-rose-100/50' :
                                                'text-slate-600 bg-slate-100 border border-slate-200'
                                            }`}>
                                                <TrendingUp size={12} strokeWidth={2} className={data.dynamic_insights.serving_trend_direction === 'down' ? 'rotate-180' : ''} />
                                                <span>{data.dynamic_insights.serving_trend_value}%</span>
                                            </div>
                                            <span className="text-[11px] text-slate-500">vs last hour</span>
                                        </div>
                                    </div>
                                    {/* Capacity Progress Bar */}
                                    <div className="mt-3.5 w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-slate-900 rounded-full transition-all duration-1000" 
                                            style={{ width: `${Math.min(100, (data.dynamic_insights.customers_being_served / (data.global_kpis.total_customers_waiting || 1)) * 100)}%` }}
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

                    {/* 3. AI Insights & Communications */}
                    <section>
                        <SectionHeader title="System Intelligence" />
                        <div className="flex flex-col gap-4">
                            {/* AI Insights Card */}
                            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                <div className="flex items-center gap-2 mb-5">
                                    <div className="text-slate-900">
                                        <Sparkles size={16} strokeWidth={2} />
                                    </div>
                                    <h3 className="text-sm font-semibold text-slate-900 tracking-tight">System Observations</h3>
                                </div>
                                <div className="space-y-3">
                                    {data.executive_insights.top_performing_branch ? (
                                        <div className="bg-amber-50/50 rounded-lg p-4 border border-amber-200/80 flex flex-col gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.01)] transition-colors">
                                            <div className="flex gap-3 items-start pr-4">
                                                <div className="mt-0.5 text-amber-500 shrink-0">
                                                    <Trophy size={16} strokeWidth={2} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-semibold text-slate-900 mb-1">Top Performer</h4>
                                                    <p className="text-xs text-slate-600 leading-relaxed">
                                                        <strong className="font-medium text-slate-900">{data.executive_insights.top_performing_branch}</strong> has successfully served <strong className="font-medium text-slate-900">{data.executive_insights.most_customers_served} customers</strong> today.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex justify-end pt-1">
                                                <Link href={`/organization-admin/branches/${data.executive_insights.top_performing_branch_id}`} className="text-[11px] font-medium text-amber-700 bg-white hover:bg-amber-50/80 px-3 py-1.5 rounded border border-amber-200 hover:border-amber-300 transition-colors shadow-sm">
                                                    Open Branch View
                                                </Link>
                                            </div>
                                        </div>
                                    ) : null}
                                    {data.executive_insights.busiest_branch ? (
                                        <div className="bg-rose-50/50 rounded-lg p-4 border border-rose-200/80 flex flex-col gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.01)] transition-colors">
                                            <div className="flex gap-3 items-start pr-4 relative">
                                                <div className="absolute top-0 right-0">
                                                    <span className="relative flex h-2 w-2">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                                                    </span>
                                                </div>
                                                <div className="mt-0.5 text-rose-500 shrink-0">
                                                    <AlertCircle size={16} strokeWidth={2} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-semibold text-slate-900 mb-1">SLA Breach Risk</h4>
                                                    <p className="text-xs text-slate-600 leading-relaxed">
                                                        High load detected at <strong className="font-medium text-slate-900">{data.executive_insights.busiest_branch}</strong>. Queue volume is approaching maximum capacity based on current staff levels.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex justify-end pt-1">
                                                <Link href={`/organization-admin/branches/${data.executive_insights.busiest_branch_id}`} className="text-[11px] font-medium text-rose-700 bg-white hover:bg-rose-50/80 px-3 py-1.5 rounded border border-rose-200 hover:border-rose-300 transition-colors shadow-sm">
                                                    Open Branch View
                                                </Link>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-emerald-50/50 rounded-lg p-4 border border-emerald-200/80 flex gap-3 items-start shadow-[0_1px_2px_rgba(0,0,0,0.01)] transition-colors">
                                            <div className="mt-0.5 text-emerald-500 shrink-0">
                                                <CheckCircle2 size={16} strokeWidth={2} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-semibold text-slate-900 mb-1">All Systems Nominal</h4>
                                                <p className="text-xs text-slate-600 leading-relaxed">
                                                    Branches are operating smoothly within expected parameters.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>


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
                                        <div className="flex items-center justify-end gap-1.5 relative group">
                                            Serving Capacity 
                                            <div className="cursor-help text-slate-400">
                                                <Info size={14} />
                                            </div>
                                            {/* Custom Tailwind Tooltip */}
                                            <div className="absolute top-full right-0 mt-2 w-56 p-2.5 bg-slate-900 text-white text-xs rounded-md shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 normal-case tracking-normal font-medium text-left pointer-events-none">
                                                Shows how many open counters are actively serving a customer right now.
                                                {/* Tooltip Arrow */}
                                                <div className="absolute bottom-full right-4 border-4 border-transparent border-b-slate-900"></div>
                                            </div>
                                        </div>
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
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1 items-end justify-center w-full max-w-[120px] ml-auto">
                                                <div className="flex items-center justify-end w-full text-[10px] font-bold text-slate-500">
                                                    <span>{b.serving_customers} / {b.active_sessions} counters</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-500 ${(() => {
                                                            const pct = (b.serving_customers / (b.active_sessions || 1)) * 100;
                                                            if (pct >= 100) return 'bg-rose-500';
                                                            if (pct >= 80) return 'bg-amber-500';
                                                            return 'bg-slate-800';
                                                        })()}`} 
                                                        style={{ width: `${Math.min(100, (b.serving_customers / (b.active_sessions || 1)) * 100)}%` }}
                                                    ></div>
                                                </div>
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
