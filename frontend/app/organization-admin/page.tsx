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
    TrendingUp, Shield, BarChart3, ChevronRight, UserCog, ArrowUpDown, MoreHorizontal, UserCheck
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

    const { selectedBranchId } = useBranchFilter();

    useEffect(() => {
        const loadData = async () => {
            try {
                const dashRes = await api.getOrgAdminDashboard(selectedBranchId || undefined);
                setData(dashRes);
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
                    <h1 className="text-2xl font-semibold text-slate-900">Command Center</h1>
                    <p className="text-sm text-slate-500 mt-1">Real-time enterprise overview for {data.organization_name}.</p>
                </div>
                <div className="shrink-0">
                    <BranchSelector />
                </div>
            </div>

            {/* 1. Executive Overview */}
            <section>
                <SectionHeader title="Executive Overview" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Total Staff Card (Replaced Org Health) */}
                    <MetricCard 
                        title="Total Staff"
                        value={data.global_kpis.total_staff}
                        subtitle={`${data.global_kpis.total_branch_admins} branch admins`}
                        icon={UserCog}
                        watermarkIcon={UserCog}
                    />

                    {selectedBranchId ? (
                        <MetricCard 
                            title="Active Queues"
                            value={data.dynamic_insights.active_queues}
                            subtitle="Running right now"
                            icon={Activity}
                            watermarkIcon={Activity}
                        />
                    ) : (
                        <MetricCard 
                            title="Total Branches"
                            value={data.global_kpis.total_branches}
                            subtitle={`${data.global_kpis.active_branches} currently active`}
                            icon={Building2}
                            watermarkIcon={Building2}
                        />
                    )}
                    
                    <MetricCard 
                        title={selectedBranchId ? "Branch Waiting" : "Global Waiting"}
                        value={selectedBranchId && data.branch_performance?.length > 0 ? data.branch_performance[0].waiting_customers : data.global_kpis.total_customers_waiting}
                        icon={Clock}
                        watermarkIcon={Clock}
                        trend="down"
                        trendValue={12}
                    />
                    <MetricCard 
                        title={selectedBranchId ? "Branch Served" : "Served Today"}
                        value={selectedBranchId && data.branch_performance?.length > 0 ? data.branch_performance[0].customers_served_today : data.global_kpis.total_customers_served_today}
                        icon={UserCheck}
                        watermarkIcon={UserCheck}
                        trend="up"
                        trendValue={8}
                    />
                </div>
            </section>

            {/* Traffic Visualization */}
            <TrafficChart />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
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
                        <div className="grid grid-cols-2 gap-4">
                            {/* Active Sessions */}
                            <PremiumCard hoverEffect className="p-4 flex flex-col justify-between h-full group">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="text-slate-400 group-hover:text-slate-600 transition-colors">
                                        <Zap size={14} strokeWidth={2} />
                                    </div>
                                    <h3 className="text-xs font-medium text-slate-600">Active Sessions</h3>
                                </div>
                                <div>
                                    <span className="text-2xl font-bold tracking-tight text-slate-900">{data.dynamic_insights.active_sessions}</span>
                                    <div className="mt-1 flex items-center gap-1">
                                        <TrendingUp size={12} className="text-emerald-500" />
                                        <span className="text-emerald-500 text-[11px] font-semibold">+12% vs last hour</span>
                                    </div>
                                </div>
                            </PremiumCard>

                            {/* Being Served */}
                            <PremiumCard hoverEffect className="p-4 flex flex-col justify-between h-full group">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="text-slate-400 group-hover:text-slate-600 transition-colors">
                                        <Users size={14} strokeWidth={2} />
                                    </div>
                                    <h3 className="text-xs font-medium text-slate-600">Being Served</h3>
                                </div>
                                <div>
                                    <span className="text-2xl font-bold tracking-tight text-slate-900">{data.dynamic_insights.customers_being_served}</span>
                                    <div className="mt-1 flex items-center gap-1">
                                        <TrendingUp size={12} className="text-emerald-500" />
                                        <span className="text-emerald-500 text-[11px] font-semibold">+8% vs last hour</span>
                                    </div>
                                    {/* Capacity Progress Bar */}
                                    <div className="mt-3 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-indigo-500 rounded-full transition-all duration-1000" 
                                            style={{ width: `${Math.min(100, (data.dynamic_insights.customers_being_served / (data.global_kpis.total_customers_waiting || 1)) * 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </PremiumCard>

                            {/* Avg Wait Time */}
                            <PremiumCard hoverEffect className="p-4 flex flex-col justify-between h-full group">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="text-slate-400 group-hover:text-slate-600 transition-colors">
                                        <Timer size={14} strokeWidth={2} />
                                    </div>
                                    <h3 className="text-xs font-medium text-slate-600">Avg Wait Time</h3>
                                </div>
                                <div>
                                    {(() => {
                                        const waitStr = String(data.dynamic_insights.average_wait_time || "0");
                                        const waitNum = parseInt(waitStr.replace(/[^0-9]/g, '')) || 0;
                                        const colorClass = waitNum >= 15 ? "text-rose-600" : waitNum >= 12 ? "text-amber-600" : "text-slate-900";
                                        
                                        return (
                                            <span className={`text-2xl font-bold tracking-tight transition-colors ${colorClass}`}>
                                                {data.dynamic_insights.average_wait_time}
                                            </span>
                                        );
                                    })()}
                                    <div className="mt-1">
                                        <span className="text-slate-500 text-[11px] font-medium">Target SLA: 15m</span>
                                    </div>
                                </div>
                            </PremiumCard>

                            {/* Avg Service Time */}
                            <PremiumCard hoverEffect className="p-4 flex flex-col justify-between h-full group">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="text-slate-400 group-hover:text-slate-600 transition-colors">
                                        <Activity size={14} strokeWidth={2} />
                                    </div>
                                    <h3 className="text-xs font-medium text-slate-600">Avg Service Time</h3>
                                </div>
                                <div>
                                    {(() => {
                                        const servStr = String(data.dynamic_insights.average_service_time || "0");
                                        const servNum = parseInt(servStr.replace(/[^0-9]/g, '')) || 0;
                                        const colorClass = servNum >= 10 ? "text-rose-600" : servNum >= 8 ? "text-amber-600" : "text-slate-900";
                                        
                                        return (
                                            <span className={`text-2xl font-bold tracking-tight transition-colors ${colorClass}`}>
                                                {data.dynamic_insights.average_service_time}
                                            </span>
                                        );
                                    })()}
                                    <div className="mt-1">
                                        <span className="text-slate-500 text-[11px] font-medium">Target SLA: 10m</span>
                                    </div>
                                </div>
                            </PremiumCard>
                        </div>
                    </section>

                    {/* 3. AI Insights & Communications */}
                    <section>
                        <SectionHeader title="System Intelligence" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* AI Insights Card */}
                            <PremiumCard className="p-5" hoverEffect={false}>
                                <div className="flex items-center gap-2.5 mb-5">
                                    <div className="text-indigo-500">
                                        <Sparkles size={16} strokeWidth={2} />
                                    </div>
                                    <h3 className="text-sm font-medium text-slate-900">System Observations</h3>
                                </div>
                                <div className="space-y-3">
                                    {data.executive_insights.top_performing_branch ? (
                                        <div className="bg-slate-50 rounded-md p-3 border border-slate-100">
                                            <p className="text-sm text-slate-600 leading-relaxed">
                                                <strong className="text-slate-900 font-medium">{data.executive_insights.top_performing_branch}</strong> is currently the top performing branch, having successfully served <strong className="text-slate-900 font-medium">{data.executive_insights.most_customers_served} customers</strong> today.
                                            </p>
                                        </div>
                                    ) : null}
                                    {data.executive_insights.busiest_branch ? (
                                        <div className="bg-rose-50 rounded-lg p-4 border border-rose-100 flex flex-col gap-3 relative overflow-hidden">
                                            {/* Pulsing Alert Indicator */}
                                            <div className="absolute top-0 right-0 p-3">
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                                                </span>
                                            </div>
                                            <div className="flex gap-3 items-start pr-6">
                                                <div className="mt-0.5 bg-rose-100 text-rose-600 p-1.5 rounded-md shrink-0">
                                                    <AlertCircle size={16} strokeWidth={2.5} />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-rose-900 mb-1">SLA Breach Risk</h4>
                                                    <p className="text-xs text-rose-700/90 leading-relaxed">
                                                        High load detected at <strong className="font-semibold text-rose-900">{data.executive_insights.busiest_branch}</strong>. Queue volume is approaching maximum capacity based on current staff levels.
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex justify-end pt-1">
                                                <button className="text-xs font-bold text-rose-700 bg-white hover:bg-rose-50 px-3 py-1.5 rounded-md border border-rose-200 transition-colors shadow-sm">
                                                    Open Branch View
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                                            <Info size={16} />
                                            No critical anomalies detected.
                                        </div>
                                    )}
                                </div>
                            </PremiumCard>


                        </div>
                    </section>
                </div>

                {/* Right Column: Global Activity */}
                <div className="lg:col-span-1">
                    <section className="h-full">
                        <SectionHeader title="Recent Activity" />
                        <div className="h-[calc(100%-2rem)] min-h-[400px]">
                            <GlobalActivityFeed />
                        </div>
                    </section>
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
                    <PremiumCard className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-widest cursor-pointer hover:bg-slate-100/50 transition-colors text-left">
                                        <div className="flex items-center gap-1.5">Branch <ArrowUpDown size={12} className="text-slate-400" /></div>
                                    </th>
                                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-widest text-left">Status</th>
                                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-widest text-right">Sessions</th>
                                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-widest cursor-pointer hover:bg-slate-100/50 transition-colors text-right">
                                        <div className="flex items-center justify-end gap-1.5">Waiting <ArrowUpDown size={12} className="text-slate-400" /></div>
                                    </th>
                                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-widest text-right">Serving Capacity</th>
                                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-widest cursor-pointer hover:bg-slate-100/50 transition-colors text-right">
                                        <div className="flex items-center justify-end gap-1.5">Served <ArrowUpDown size={12} className="text-slate-400" /></div>
                                    </th>
                                    <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-widest text-right">Avg Wait</th>
                                    <th className="px-4 py-2.5 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.branch_performance.map((b) => {
                                    const hasAlert = b.name === data.executive_insights?.busiest_branch;
                                    return (
                                    <tr key={b.id} className={`${hasAlert ? 'bg-red-50/40 hover:bg-red-50/60' : 'hover:bg-slate-50/80'} transition-colors group`}>
                                        <td className="px-4 py-3 text-left">
                                            <p className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors cursor-pointer">{b.name}</p>
                                        </td>
                                        <td className="px-4 py-3 text-left">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${hasAlert ? 'bg-rose-100/80 text-rose-700' : b.status === 'Active' ? 'bg-emerald-100/80 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                                {hasAlert ? (
                                                    <span className="relative flex h-1.5 w-1.5">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                                                    </span>
                                                ) : (
                                                    <span className={`w-1.5 h-1.5 rounded-full ${b.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                                )}
                                                {hasAlert ? 'Alert' : b.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-700">{b.active_sessions}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <span className="font-bold text-sm text-slate-800">{b.waiting_customers}</span>
                                                <span className={`text-[10px] font-bold flex items-center ${b.waiting_customers > 5 ? 'text-amber-500' : 'text-emerald-500'}`}>{b.waiting_customers > 5 ? '↑' : '↓'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1 items-end justify-center w-full max-w-[120px] ml-auto">
                                                <div className="flex items-center justify-end w-full text-[10px] font-bold text-slate-500">
                                                    <span>{b.serving_customers} / {b.active_sessions} counters</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-indigo-500 rounded-full" 
                                                        style={{ width: `${Math.min(100, (b.serving_customers / (b.active_sessions || 1)) * 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <span className="font-bold text-sm text-slate-800">{b.customers_served_today}</span>
                                                <span className="text-[10px] font-bold text-emerald-500 flex items-center">↑</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-600">{b.avg_wait_time}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Link
                                                    href={`/organization-admin/branches/${b.id}`}
                                                    className="inline-flex items-center justify-center p-1.5 text-slate-400 bg-white hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-md transition-all shadow-sm"
                                                    title="View Live"
                                                >
                                                    <ExternalLink size={16} strokeWidth={2.5} />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </PremiumCard>
                )}
            </section>

        </div>
    );
}
