"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useBranchFilter } from "@/context/BranchFilterContext";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Building2, Users, PlayCircle, CheckCircle2, Activity, Clock, MessageCircle, AlertTriangle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import BranchSelector from "@/components/organization-admin/BranchSelector";

interface GlobalKPIs {
    total_branches: number;
    active_branches: number;
    inactive_branches: number;
    total_staff: number;
    total_branch_admins: number;
    total_customers_waiting: number;
    total_customers_served_today: number;
    org_health_score: number;
}

interface DynamicInsights {
    active_sessions: number;
    active_queues: number;
    customers_being_served: number;
    average_wait_time: string;
    average_service_time: string;
    whatsapp_success_rate: number;
}

interface ExecutiveInsights {
    top_performing_branch?: string;
    busiest_branch?: string;
    best_avg_wait_time?: string;
    most_customers_served?: string;
    most_active_queue?: string;
}

interface WhatsAppOverview {
    messages_sent_today: number;
    delivered: number;
    failed: number;
    pending: number;
    success_rate: number;
}

interface BranchHealthOverview {
    healthy_branches: number;
    warning_branches: number;
    critical_branches: number;
}

interface DashboardAlert {
    message: string;
    type: string;
    severity: string;
}

interface BranchPerformanceRow {
    id: string;
    name: string;
    slug: string;
    waiting_customers: number;
    serving_customers: number;
    customers_served_today: number;
    avg_wait_time: string;
    active_sessions: number;
    active_queues: number;
    status: string;
}

interface DashboardMetricsResponse {
    organization_name: string;
    global_kpis: GlobalKPIs;
    dynamic_insights: DynamicInsights;
    executive_insights: ExecutiveInsights;
    whatsapp_overview: WhatsAppOverview;
    branch_health: BranchHealthOverview;
    alerts: DashboardAlert[];
    branch_performance: BranchPerformanceRow[];
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
        const interval = setInterval(loadData, 15000); // 15s polling
        return () => clearInterval(interval);
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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header & Global KPIs */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{data.organization_name} Command Center</h1>
                        <p className="text-sm text-slate-500 mt-1">Global organization metrics & intelligence.</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 px-5 py-3 flex items-center gap-4 shadow-sm">
                        <div className="flex flex-col">
                            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Org Health Score</span>
                            <span className={`text-xl font-bold ${data.global_kpis.org_health_score >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {data.global_kpis.org_health_score} / 100
                            </span>
                        </div>
                    </div>
                </div>

                {/* Global Fixed KPIs (Always show full org metrics) */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center gap-2 text-slate-500 mb-2">
                            <Building2 size={16} />
                            <span className="text-xs font-semibold uppercase tracking-wider">Branches</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{data.global_kpis.total_branches}</p>
                        <p className="text-xs text-emerald-600 font-medium mt-1">{data.global_kpis.active_branches} Active</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center gap-2 text-slate-500 mb-2">
                            <Users size={16} />
                            <span className="text-xs font-semibold uppercase tracking-wider">Total Staff</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{data.global_kpis.total_staff}</p>
                        <p className="text-xs text-indigo-600 font-medium mt-1">{data.global_kpis.total_branch_admins} Branch Admins</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center gap-2 text-slate-500 mb-2">
                            <Clock size={16} />
                            <span className="text-xs font-semibold uppercase tracking-wider">Global Waiting</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{data.global_kpis.total_customers_waiting}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center gap-2 text-slate-500 mb-2">
                            <CheckCircle2 size={16} />
                            <span className="text-xs font-semibold uppercase tracking-wider">Global Served</span>
                        </div>
                        <p className="text-2xl font-bold text-slate-900">{data.global_kpis.total_customers_served_today}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 hidden lg:block">
                        <div className="flex items-center gap-2 text-slate-500 mb-2">
                            <ShieldCheck size={16} />
                            <span className="text-xs font-semibold uppercase tracking-wider">System</span>
                        </div>
                        <p className="text-sm font-semibold text-emerald-600">All Systems Operational</p>
                    </div>
                </div>
            </div>

            <hr className="border-slate-200" />

            {/* Filter Section */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3">
                    <Activity className="text-indigo-600" />
                    <h2 className="text-lg font-bold text-slate-900">Dynamic Insights Hub</h2>
                </div>
                <div className="w-64">
                    <BranchSelector />
                </div>
            </div>

            {/* Dynamic Operations & Executive Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Dynamic Operational Insights */}
                <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                        <p className="text-sm text-slate-500 font-medium mb-1">Active Sessions</p>
                        <p className="text-3xl font-bold text-slate-900">{data.dynamic_insights.active_sessions}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                        <p className="text-sm text-slate-500 font-medium mb-1">Active Queues</p>
                        <p className="text-3xl font-bold text-slate-900">{data.dynamic_insights.active_queues}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                        <p className="text-sm text-slate-500 font-medium mb-1">Being Served</p>
                        <p className="text-3xl font-bold text-slate-900">{data.dynamic_insights.customers_being_served}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                        <p className="text-sm text-slate-500 font-medium mb-1">Avg Wait Time</p>
                        <p className="text-3xl font-bold text-slate-900">{data.dynamic_insights.average_wait_time}</p>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                        <p className="text-sm text-slate-500 font-medium mb-1">Avg Service Time</p>
                        <p className="text-3xl font-bold text-slate-900">{data.dynamic_insights.average_service_time}</p>
                    </div>
                    
                    {/* WhatsApp Overview Inline Widget */}
                    <div className="bg-indigo-600 text-white rounded-xl shadow-sm border border-indigo-500 p-5">
                        <div className="flex items-center gap-2 mb-1">
                            <MessageCircle size={16} className="text-indigo-200" />
                            <p className="text-sm font-medium text-indigo-100">WhatsApp Delivery</p>
                        </div>
                        <p className="text-3xl font-bold">{data.whatsapp_overview.success_rate.toFixed(1)}%</p>
                        <p className="text-xs text-indigo-200 mt-1">{data.whatsapp_overview.messages_sent_today} Msgs Sent Today</p>
                    </div>
                </div>

                {/* Executive Insights Panel */}
                <div className="bg-slate-900 text-white rounded-xl shadow-sm border border-slate-800 p-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                        <Activity size={16} />
                        Executive Brief
                    </h3>
                    
                    <div className="space-y-5">
                        {data.executive_insights.top_performing_branch ? (
                            <div>
                                <p className="text-xs text-slate-400 font-medium mb-1">Top Performing Branch</p>
                                <p className="text-lg font-bold text-indigo-400">{data.executive_insights.top_performing_branch}</p>
                                <p className="text-xs text-slate-500">{data.executive_insights.most_customers_served} Served Today</p>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 italic">No significant branch data yet.</p>
                        )}

                        {data.executive_insights.busiest_branch && (
                            <div>
                                <p className="text-xs text-slate-400 font-medium mb-1">Busiest Branch Right Now</p>
                                <p className="text-lg font-bold text-rose-400">{data.executive_insights.busiest_branch}</p>
                            </div>
                        )}
                        
                        <div className="pt-4 border-t border-slate-800">
                            <Link href="/organization-admin/analytics" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                                Open Full Analytics →
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Branch Performance Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">Live Branch Performance</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Branch</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-center">Active Sessions</th>
                                <th className="px-6 py-4 text-center">Waiting</th>
                                <th className="px-6 py-4 text-center">Serving</th>
                                <th className="px-6 py-4 text-center">Served Today</th>
                                <th className="px-6 py-4 text-center">Avg Wait</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.branch_performance.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-slate-500">
                                        No branch data available for this filter.
                                    </td>
                                </tr>
                            ) : (
                                data.branch_performance.map((b) => (
                                    <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-slate-900">{b.name}</p>
                                            <p className="text-xs text-slate-500">{b.slug}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${b.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                {b.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center font-medium text-slate-700">{b.active_sessions}</td>
                                        <td className="px-6 py-4 text-center font-bold text-rose-600">{b.waiting_customers}</td>
                                        <td className="px-6 py-4 text-center font-bold text-amber-600">{b.serving_customers}</td>
                                        <td className="px-6 py-4 text-center font-bold text-emerald-600">{b.customers_served_today}</td>
                                        <td className="px-6 py-4 text-center text-sm text-slate-600">{b.avg_wait_time}</td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/organization-admin/branches/${b.id}`}
                                                className="inline-flex items-center px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                                            >
                                                Open Branch
                                            </Link>
                                        </td>
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
