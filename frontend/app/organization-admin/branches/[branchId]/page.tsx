"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, ShieldAlert, ShieldCheck, X, Calendar, RefreshCw, Filter, AlertCircle } from "lucide-react";
import Link from "next/link";
import { getToken } from "@/lib/auth";
import ConfirmModal from "@/components/ConfirmModal";

// Import all modular components
import BranchExecutiveSummary from "@/components/organization-admin/branch-details/BranchExecutiveSummary";
import BranchTodayPerformance from "@/components/organization-admin/branch-details/BranchTodayPerformance";
import BranchQueueBreakdown from "@/components/organization-admin/branch-details/BranchQueueBreakdown";
import BranchAppointmentsCard from "@/components/organization-admin/branch-details/BranchAppointmentsCard";
import BranchStaffOverview from "@/components/organization-admin/branch-details/BranchStaffOverview";
import BranchAdminsOverview from "@/components/organization-admin/branch-details/BranchAdminsOverview";

import BranchHealthCenter from "@/components/organization-admin/branch-details/BranchHealthCenter";
import BranchActivityTimeline from "@/components/organization-admin/branch-details/BranchActivityTimeline";
import BranchContactCard from "@/components/organization-admin/branch-details/BranchContactCard";
import BranchAlerts from "@/components/organization-admin/branch-details/BranchAlerts";

const PERIOD_OPTIONS = [
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "7d", label: "Last 7 Days" },
    { key: "30d", label: "Last 30 Days" },
    { key: "this_month", label: "This Month" },
    { key: "all", label: "All Time" },
    { key: "custom", label: "Custom Range" },
];

export default function BranchDetailsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const branchId = params.branchId as string;

    const urlPeriod = searchParams.get("period");
    const urlStart = searchParams.get("start_date");
    const urlEnd = searchParams.get("end_date");

    const [branch, setBranch] = useState<any>(null);
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

    // Timeframe filters
    const [period, setPeriod] = useState<string>(urlPeriod || "today");
    const [startDate, setStartDate] = useState<string>(urlStart || "");
    const [endDate, setEndDate] = useState<string>(urlEnd || "");
    const [tempStart, setTempStart] = useState<string>(urlStart || "");
    const [tempEnd, setTempEnd] = useState<string>(urlEnd || "");
    const [isCustomOpen, setIsCustomOpen] = useState(urlPeriod === "custom");
    
    // Scroll detection for header
    const [showSubNav, setShowSubNav] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                // Scrolling down
                setShowSubNav(false);
            } else {
                // Scrolling up
                setShowSubNav(true);
            }
            setLastScrollY(currentScrollY);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [lastScrollY]);

    const loadDashboard = useCallback(async () => {
        setIsRefreshing(true);
        try {
            const [branchInfo, dashboard] = await Promise.all([
                api.getBranchDetails(branchId),
                api.getBranchDashboard(branchId, {
                    period,
                    start_date: startDate || undefined,
                    end_date: endDate || undefined,
                })
            ]);
            setBranch(branchInfo);
            setDashboardData(dashboard);
        } catch (error: any) {
            toast.error(error.message || "Failed to load branch dashboard");
            router.push(`/organization-admin/branches`);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [branchId, period, startDate, endDate, router]);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    const handlePeriodChange = (key: string) => {
        if (key === "custom") {
            setIsCustomOpen(true);
        } else {
            setIsCustomOpen(false);
            setStartDate("");
            setEndDate("");
            setPeriod(key);

            if (typeof window !== "undefined") {
                const nextParams = new URLSearchParams(window.location.search);
                nextParams.set("period", key);
                nextParams.delete("start_date");
                nextParams.delete("end_date");
                router.replace(`?${nextParams.toString()}`, { scroll: false });
            }
        }
    };

    const handleApplyCustomDate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!tempStart || !tempEnd) {
            toast.error("Please specify both start and end dates");
            return;
        }
        if (tempStart > tempEnd) {
            toast.error("Start date must be before or equal to end date");
            return;
        }
        setStartDate(tempStart);
        setEndDate(tempEnd);
        setPeriod("custom");

        if (typeof window !== "undefined") {
            const nextParams = new URLSearchParams(window.location.search);
            nextParams.set("period", "custom");
            nextParams.set("start_date", tempStart);
            nextParams.set("end_date", tempEnd);
            router.replace(`?${nextParams.toString()}`, { scroll: false });
        }
    };

    const getPeriodBadgeLabel = () => {
        if (period === "custom" && startDate && endDate) {
            return `${startDate} – ${endDate}`;
        }
        const found = PERIOD_OPTIONS.find(o => o.key === period);
        return found ? found.label : "Live";
    };

    const handleToggleStatus = () => {
        setIsConfirmModalOpen(true);
    };

    const confirmToggle = async () => {
        if (!branch) return;
        setIsConfirmModalOpen(false);

        const action = branch.is_active ? 'deactivate' : 'activate';
        const loadingId = toast.loading(`Initiating branch ${action}...`);

        try {
            await api.updateBranchStatus(branchId, !branch.is_active);
            toast.dismiss(loadingId);
            
            if (branch.is_active) {
                toast.custom((t) => (
                    <div className="flex flex-row items-start gap-4 p-4 bg-white border border-red-200 rounded-xl shadow-lg shadow-red-900/5 w-full min-w-[340px] max-w-[400px] pointer-events-auto">
                        <div className="flex-shrink-0 p-2 bg-red-50 rounded-full">
                            <ShieldAlert className="w-6 h-6 text-red-600" />
                        </div>
                        <div className="flex-1 pt-1">
                            <p className="text-sm font-semibold text-slate-900">Operations Suspended</p>
                            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                                <strong className="font-medium text-slate-700">{branch.name}</strong> has been deactivated successfully. All access has been immediately revoked.
                            </p>
                        </div>
                        <button onClick={() => toast.dismiss(t)} className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ), { duration: 5000 });
            } else {
                toast.custom((t) => (
                    <div className="flex flex-row items-start gap-4 p-4 bg-white border border-emerald-200 rounded-xl shadow-lg shadow-emerald-900/5 w-full min-w-[340px] max-w-[400px] pointer-events-auto">
                        <div className="flex-shrink-0 p-2 bg-emerald-50 rounded-full">
                            <ShieldCheck className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div className="flex-1 pt-1">
                            <p className="text-sm font-semibold text-slate-900">Operations Resumed</p>
                            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                                <strong className="font-medium text-slate-700">{branch.name}</strong> is now live and fully accessible by staff.
                            </p>
                        </div>
                        <button onClick={() => toast.dismiss(t)} className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ), { duration: 5000 });
            }
            
            loadDashboard();
        } catch (error: any) {
            toast.error(error.message || "Failed to update status", { id: loadingId });
        }
    };

    if (isLoading) {
        return (
            <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
                Loading Branch Operations Center...
            </div>
        );
    }

    if (!branch) return null;

    return (
        <div className="-mt-4 sm:-mt-6 lg:-mt-8 bg-slate-50 min-h-screen pb-12">
            {/* Premium Detail Header */}
            <div className={`sticky -top-4 sm:-top-6 lg:-top-8 z-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 py-4 mb-6 shadow-sm transition-transform duration-300 ease-in-out ${showSubNav ? 'translate-y-0' : '-translate-y-full'}`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between max-w-7xl mx-auto gap-4 sm:gap-0">
                    
                    {/* Left: Title & Status */}
                    <div className="flex items-center gap-4">
                        <Link 
                            href="/organization-admin/branches" 
                            className="p-2 -ml-2 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all" 
                            title="Back to Branches"
                        >
                            <ArrowLeft size={20} strokeWidth={2} />
                        </Link>
                        
                        <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
                            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{branch.name}</h1>
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-bold tracking-widest uppercase ${branch.is_active ? 'bg-emerald-50/50 border-emerald-200/60 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${branch.is_active ? (period === "today" ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-emerald-500') : 'bg-slate-400'}`}></div>
                                {branch.is_active ? (period === "today" ? 'Live' : getPeriodBadgeLabel()) : 'Inactive'}
                            </div>
                        </div>
                    </div>

                    {/* Right: Actions & Meta */}
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        
                        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200/60 rounded-lg text-xs font-medium text-slate-600 mr-2">
                            <span className="text-slate-400 font-normal">Ref:</span> 
                            {branch.slug}
                        </div>

                        <button 
                            onClick={handleToggleStatus}
                            className={`px-4 py-2 text-sm font-semibold border rounded-lg transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                                branch.is_active 
                                ? 'bg-white border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 focus:ring-rose-500' 
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 focus:ring-emerald-500'
                            }`}
                        >
                            {branch.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        
                        <Link
                            href={`/organization-admin/branches/${branchId}/admin#token=${getToken("org_admin") || ""}`}
                            target="_blank"
                            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 border border-transparent rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-1"
                        >
                            Dashboard <ExternalLink size={16} strokeWidth={2} />
                        </Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-20">
                {/* ── Timeframe Filter Toolbar ── */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-3 sm:p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        {/* Preset Buttons */}
                        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">
                                <Calendar size={14} className="text-indigo-600" />
                                <span>Timeframe:</span>
                            </div>

                            {PERIOD_OPTIONS.map((opt) => {
                                const isActive = period === opt.key;
                                return (
                                    <button
                                        key={opt.key}
                                        type="button"
                                        onClick={() => handlePeriodChange(opt.key)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            isActive
                                                ? "bg-indigo-600 text-white shadow-xs"
                                                : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Refresh Button */}
                        <button
                            type="button"
                            onClick={() => loadDashboard()}
                            disabled={isRefreshing}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer disabled:opacity-50"
                            title="Refresh data"
                        >
                            <RefreshCw size={13} className={isRefreshing ? "animate-spin text-indigo-600" : ""} />
                            <span>Refresh</span>
                        </button>
                    </div>

                    {/* Custom Date Range Picker */}
                    {isCustomOpen && (
                        <form onSubmit={handleApplyCustomDate} className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-500">From:</span>
                                <input
                                    type="date"
                                    value={tempStart}
                                    onChange={(e) => setTempStart(e.target.value)}
                                    className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-500">To:</span>
                                <input
                                    type="date"
                                    value={tempEnd}
                                    onChange={(e) => setTempEnd(e.target.value)}
                                    className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                            </div>
                            <button
                                type="submit"
                                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            >
                                Apply Range
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsCustomOpen(false);
                                    if (!startDate) setPeriod("today");
                                }}
                                className="px-2 py-1 text-slate-400 hover:text-slate-600 text-xs font-semibold"
                            >
                                Cancel
                            </button>
                        </form>
                    )}
                </div>

                {/* Notice banner if Today has 0 activity */}
                {period === "today" && dashboardData?.summary && dashboardData.summary.total_customers === 0 && (
                    <div className="bg-white border border-indigo-100 rounded-xl p-3.5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 text-slate-700">
                            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                                <AlertCircle size={15} />
                            </div>
                            <span>
                                <strong>No customer activity for today yet.</strong> Branch metrics above show real-time sessions. Switch to a wider timeframe to view historical consultations.
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => handlePeriodChange("all")}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg border border-indigo-200 transition-colors cursor-pointer shrink-0"
                        >
                            View All Time Records →
                        </button>
                    </div>
                )}
            
                {/* SECTION 1: Executive Summary */}
                <BranchExecutiveSummary data={dashboardData?.summary} />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Left Column: 2/3 width */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* SECTION 2: Performance Overview */}
                        <BranchTodayPerformance 
                            data={dashboardData?.performance} 
                            periodLabel={getPeriodBadgeLabel()}
                        />

                        {/* SECTION 3: Queue Breakdown */}
                        <BranchQueueBreakdown data={dashboardData?.queues} />
                        
                        {/* SECTION 4: Confirmed Appointments */}
                        <BranchAppointmentsCard data={dashboardData?.appointments} branchId={branchId} />
                        
                        {/* SECTION 4.5: Branch Admins */}
                        <BranchAdminsOverview branchId={branchId} data={dashboardData?.admins} onUpdate={loadDashboard} />

                        {/* SECTION 5: Staff Overview */}
                        <BranchStaffOverview data={dashboardData?.staff} />

                    </div>

                    {/* Right Column: 1/3 width */}
                    <div className="space-y-6">
                        {/* SECTION 11: Alerts & Issues */}
                        <BranchAlerts data={dashboardData?.alerts} />

                        {/* SECTION 8: Branch Health Center */}
                        <BranchHealthCenter data={dashboardData?.health} />
                        
                        {/* SECTION 10: Branch Contact Information */}
                        <BranchContactCard branchId={branchId} data={dashboardData?.contact} onUpdate={loadDashboard} />
                        
                    </div>

                    {/* Full Width Bottom Section */}
                    <div className="lg:col-span-3">
                        {/* SECTION 9: Recent Activity Timeline */}
                        <BranchActivityTimeline data={dashboardData?.timeline} traffic={dashboardData?.traffic} />
                    </div>
                </div>

                <ConfirmModal
                    isOpen={isConfirmModalOpen}
                    title={branch.is_active ? "Deactivate Branch" : "Activate Branch"}
                    message={branch.is_active 
                        ? `Are you sure you want to deactivate ${branch.name}? Staff and admins will lose access to the dashboard until it is reactivated.`
                        : `Are you sure you want to activate ${branch.name}? Staff and admins will regain access to their dashboard.`}
                    confirmLabel={branch.is_active ? "Deactivate" : "Activate"}
                    confirmVariant={branch.is_active ? "danger" : "primary"}
                    onConfirm={confirmToggle}
                    onCancel={() => setIsConfirmModalOpen(false)}
                />
            </div>
        </div>
    );
}
