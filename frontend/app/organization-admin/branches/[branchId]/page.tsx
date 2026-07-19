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
import BranchFuturePlaceholders from "@/components/organization-admin/branch-details/BranchFuturePlaceholders";
export default function BranchDetailsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const branchId = params.branchId as string;

    const [branch, setBranch] = useState<any>(null);
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

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
            {/* Minimalist Sub-Navigation Header */}
            <div className="sticky -top-4 sm:-top-6 lg:-top-8 z-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-white/80 backdrop-blur-md border-b border-slate-200 py-3 mb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between max-w-7xl mx-auto gap-4 sm:gap-0">
                    <div className="flex items-center gap-3">
                        <Link href="/organization-admin/branches" className="text-slate-400 hover:text-slate-900 transition-colors" title="Back to Branches">
                            <ArrowLeft size={18} strokeWidth={2} />
                        </Link>
                        <div className="flex items-center gap-3">
                            <h1 className="text-lg font-semibold text-slate-900 tracking-tight">{branch.name}</h1>
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase ${branch.is_active ? 'bg-emerald-500/10 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                <span className={`w-1 h-1 rounded-full ${branch.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                {branch.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
                        <div className="text-xs text-slate-500 hidden sm:block mr-2 font-medium">
                            <span className="text-slate-400">Ref:</span> {branch.slug}
                        </div>
                        <button 
                            onClick={handleToggleStatus}
                            className="text-xs px-3 py-1.5 font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-md transition-colors shadow-sm"
                        >
                            {branch.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <Link
                            href={`/organization-admin/branches/${branchId}/admin#token=${getToken("org_admin") || ""}`}
                            target="_blank"
                            className="text-xs px-3 py-1.5 font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm flex items-center gap-2 transition-colors"
                        >
                            Dashboard <ExternalLink size={14} />
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
                    
                    {/* SECTION 12: Future Enterprise Placeholders */}
                    <BranchFuturePlaceholders />
                </div>

                {/* Full Width Bottom Section */}
                <div className="lg:col-span-3">
                    {/* SECTION 9: Recent Activity Timeline */}
                    <BranchActivityTimeline data={dashboardData?.timeline} traffic={dashboardData?.traffic} />
                </div>
            </div>

            <ConfirmModal
                isOpen={isConfirmModalOpen}
                title={branch.is_active ? "Suspend Operations" : "Resume Operations"}
                message={branch.is_active 
                    ? `Are you sure you want to suspend operations for ${branch.name}? Staff and admins will lose access to the dashboard until it is reactivated.`
                    : `Are you sure you want to resume operations for ${branch.name}? Staff and admins will regain access to their dashboard.`}
                confirmLabel={branch.is_active ? "Suspend Operations" : "Resume Operations"}
                confirmVariant={branch.is_active ? "danger" : "primary"}
                onConfirm={confirmToggle}
                onCancel={() => setIsConfirmModalOpen(false)}
            />
        </div>
        </div>
    );
}
