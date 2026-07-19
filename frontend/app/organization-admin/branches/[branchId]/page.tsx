"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, ShieldAlert, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { getToken } from "@/lib/auth";
import ConfirmModal from "@/components/ConfirmModal";

// Import all modular components
import BranchExecutiveSummary from "@/components/organization-admin/branch-details/BranchExecutiveSummary";
import BranchTodayPerformance from "@/components/organization-admin/branch-details/BranchTodayPerformance";
import BranchQueueBreakdown from "@/components/organization-admin/branch-details/BranchQueueBreakdown";
import BranchSessionBreakdown from "@/components/organization-admin/branch-details/BranchSessionBreakdown";
import BranchStaffOverview from "@/components/organization-admin/branch-details/BranchStaffOverview";
import BranchAdminsOverview from "@/components/organization-admin/branch-details/BranchAdminsOverview";

import BranchHealthCenter from "@/components/organization-admin/branch-details/BranchHealthCenter";
import BranchActivityTimeline from "@/components/organization-admin/branch-details/BranchActivityTimeline";
import BranchContactCard from "@/components/organization-admin/branch-details/BranchContactCard";
import BranchAlerts from "@/components/organization-admin/branch-details/BranchAlerts";
export default function BranchDetailsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const branchId = params.branchId as string;

    const [branch, setBranch] = useState<any>(null);
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    
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
        try {
            const [branchInfo, dashboard] = await Promise.all([
                api.getBranchDetails(branchId),
                api.getBranchDashboard(branchId)
            ]);
            setBranch(branchInfo);
            setDashboardData(dashboard);
        } catch (error: any) {
            toast.error(error.message || "Failed to load branch dashboard");
            router.push(`/organization-admin/branches`);
        } finally {
            setIsLoading(false);
        }
    }, [branchId, router]);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

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
            <div className={`sticky -top-4 sm:-top-6 lg:-top-8 z-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 py-4 mb-8 shadow-sm transition-transform duration-300 ease-in-out ${showSubNav ? 'translate-y-0' : '-translate-y-full'}`}>
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
                                <div className={`w-1.5 h-1.5 rounded-full ${branch.is_active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-400'}`}></div>
                                {branch.is_active ? 'Live' : 'Inactive'}
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

            <div className="space-y-6 pb-20">
                {/* Modular Layout with Suspense boundaries (implied by components internal loading state) */}
            
            {/* SECTION 1: Executive Summary */}
            <BranchExecutiveSummary data={dashboardData?.summary} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column: 2/3 width */}
                <div className="lg:col-span-2 space-y-6">
                    {/* SECTION 2: Today's Performance */}
                    <BranchTodayPerformance data={dashboardData?.performance} />

                    
                    {/* SECTION 3: Queue Breakdown */}
                    <BranchQueueBreakdown data={dashboardData?.queues} />
                    
                    {/* SECTION 4: Session Breakdown */}
                    <BranchSessionBreakdown data={dashboardData?.sessions} />
                    
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
