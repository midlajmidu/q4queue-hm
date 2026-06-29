"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";

// Import all modular components
import BranchExecutiveSummary from "@/components/organization-admin/branch-details/BranchExecutiveSummary";
import BranchTodayPerformance from "@/components/organization-admin/branch-details/BranchTodayPerformance";
import BranchQueueBreakdown from "@/components/organization-admin/branch-details/BranchQueueBreakdown";
import BranchSessionBreakdown from "@/components/organization-admin/branch-details/BranchSessionBreakdown";
import BranchStaffOverview from "@/components/organization-admin/branch-details/BranchStaffOverview";

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
    const [isLoading, setIsLoading] = useState(true);

    const loadBranchHeader = useCallback(async () => {
        try {
            // We just need basic details for the header (name, slug, is_active)
            const data = await api.getBranchDetails(branchId);
            setBranch(data);
        } catch (error: any) {
            toast.error(error.message || "Failed to load branch details");
            router.push(`/organization-admin/branches`);
        } finally {
            setIsLoading(false);
        }
    }, [branchId, router]);

    useEffect(() => {
        loadBranchHeader();
    }, [loadBranchHeader]);

    const handleToggleStatus = async () => {
        if (!branch) return;
        try {
            await api.updateBranchStatus(branchId, !branch.is_active);
            toast.success(`Branch ${!branch.is_active ? 'activated' : 'deactivated'} successfully`);
            loadBranchHeader();
        } catch (error: any) {
            toast.error(error.message || "Failed to update status");
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
        <div className="space-y-6 pb-20">
            {/* Header section remains fast and instant */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                    <Link 
                        href={`/organization-admin/branches`}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-slate-900">{branch.name}</h1>
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                branch.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
                            }`}>
                                {branch.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <p className="text-slate-500 text-sm font-mono mt-1">/{branch.slug}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleToggleStatus}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            branch.is_active 
                            ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' 
                            : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                    >
                        {branch.is_active ? 'Deactivate Branch' : 'Activate Branch'}
                    </button>
                    <Link
                        href={`/organization-admin/branches/${branchId}/admin`}
                        target="_blank"
                        className="flex items-center gap-2 bg-indigo-600 text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                    >
                        Open Dashboard <ExternalLink size={16} />
                    </Link>
                </div>
            </div>

            {/* Modular Layout with Suspense boundaries (implied by components internal loading state) */}
            
            {/* SECTION 1: Executive Summary */}
            <BranchExecutiveSummary branchId={branchId} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column: 2/3 width */}
                <div className="lg:col-span-2 space-y-6">
                    {/* SECTION 2: Today's Performance */}
                    <BranchTodayPerformance branchId={branchId} />

                    
                    {/* SECTION 3: Queue Breakdown */}
                    <BranchQueueBreakdown branchId={branchId} />
                    
                    {/* SECTION 4: Session Breakdown */}
                    <BranchSessionBreakdown branchId={branchId} />
                    
                    {/* SECTION 5: Staff Overview */}
                    <BranchStaffOverview branchId={branchId} />

                </div>

                {/* Right Column: 1/3 width */}
                <div className="space-y-6">
                    {/* SECTION 11: Alerts & Issues */}
                    <BranchAlerts branchId={branchId} />

                    {/* SECTION 8: Branch Health Center */}
                    <BranchHealthCenter branchId={branchId} />
                    
                    {/* SECTION 10: Branch Contact Information */}
                    <BranchContactCard branchId={branchId} />
                    
                    {/* SECTION 12: Future Enterprise Placeholders */}
                    <BranchFuturePlaceholders />
                </div>

                {/* Full Width Bottom Section */}
                <div className="lg:col-span-3">
                    {/* SECTION 9: Recent Activity Timeline */}
                    <BranchActivityTimeline branchId={branchId} />
                </div>
            </div>
        </div>
    );
}
