"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Building2, Power, AlertTriangle, RefreshCw, LogOut } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function BranchOperationsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const params = useParams();
    const branchId = params.branchId as string;
    
    const [branch, setBranch] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    const fetchBranchOperations = async () => {
        try {
            const data = await api.getOrgAdminBranchOperations(branchId);
            setBranch(data);
        } catch (err) {
            toast.error("Failed to load branch operations");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBranchOperations();
    }, [branchId]);

    const toggleStatus = async () => {
        if (!confirm(`Are you sure you want to ${branch.is_active ? 'disable' : 'enable'} this branch?`)) return;
        
        setUpdating(true);
        try {
            await api.updateOrgAdminBranchStatus(branchId, !branch.is_active);
            toast.success(`Branch ${branch.is_active ? 'disabled' : 'enabled'} successfully`);
            fetchBranchOperations();
        } catch (err) {
            toast.error("Failed to update branch status");
        } finally {
            setUpdating(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading operations...</div>;
    if (!branch) return <div className="p-8 text-center text-red-500">Branch not found.</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                        <Link href="/organization-admin/branches" className="hover:text-indigo-600 transition-colors">Branches</Link>
                        <span>/</span>
                        <span className="text-slate-900 font-medium">{branch.name}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <Building2 className="text-slate-400" />
                        Branch Operations Center
                    </h1>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <Power size={20} className={branch.is_active ? "text-emerald-500" : "text-rose-500"} />
                        Branch Status
                    </h2>
                    
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <p className="text-sm text-slate-500">Current Status</p>
                            <p className={`text-lg font-bold ${branch.is_active ? "text-emerald-600" : "text-rose-600"}`}>
                                {branch.is_active ? "Active & Running" : "Disabled"}
                            </p>
                        </div>
                        <button
                            onClick={toggleStatus}
                            disabled={updating}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                                branch.is_active 
                                ? "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200" 
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                            }`}
                        >
                            {updating ? "Updating..." : (branch.is_active ? "Disable Branch" : "Enable Branch")}
                        </button>
                    </div>

                    {!branch.is_active && (
                        <div className="bg-rose-50 p-3 rounded-lg border border-rose-100 flex items-start gap-2">
                            <AlertTriangle size={16} className="text-rose-600 mt-0.5 shrink-0" />
                            <p className="text-sm text-rose-700">
                                This branch is currently disabled. Staff cannot log in, and customers cannot join queues.
                            </p>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <RefreshCw size={20} className="text-indigo-600" />
                        System Maintenance
                    </h2>
                    <p className="text-slate-600 text-sm mb-4">
                        Clear local caches or forcibly refresh tokens for this branch if they are experiencing syncing issues.
                    </p>
                    <div className="space-y-3">
                        <button className="w-full px-4 py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-100 font-medium transition-colors flex items-center justify-center gap-2">
                            Clear Branch Cache
                        </button>
                        <button className="w-full px-4 py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-100 font-medium transition-colors flex items-center justify-center gap-2">
                            Reset Active Sessions
                        </button>
                    </div>
                </div>

                <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <LogOut size={20} className="text-slate-400" />
                        Access Branch Dashboard
                    </h2>
                    <p className="text-slate-600 text-sm mb-6">
                        Open the branch's dashboard in read-only or managed mode to see exactly what the branch staff sees.
                    </p>
                    <div className="flex gap-4">
                        <a 
                            href={`/${branch.slug}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                        >
                            Open Public View
                        </a>
                        <button className="bg-slate-100 text-slate-700 px-6 py-2.5 rounded-lg font-medium hover:bg-slate-200 border border-slate-200 transition-colors">
                            Enter Managed View (Staff Proxy)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
