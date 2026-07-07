"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { BranchAdminItem } from "@/types/api";
import AssignAdminModal from "./AssignAdminModal";
import ResetAdminPasswordModal from "./ResetAdminPasswordModal";
import { Shield, Plus, Key } from "lucide-react";

export default function BranchAdminsOverview({ branchId }: { branchId: string }) {
    const [data, setData] = useState<BranchAdminItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [resetAdmin, setResetAdmin] = useState<BranchAdminItem | null>(null);

    const loadAdmins = useCallback(() => {
        setLoading(true);
        api.getBranchAdminsOverview(branchId).then(setData).finally(() => setLoading(false));
    }, [branchId]);

    useEffect(() => {
        loadAdmins();
    }, [loadAdmins]);

    if (loading) return <div className="h-40 bg-slate-100 animate-pulse rounded-2xl"></div>;

    return (
        <div className="bg-white rounded-[20px] border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100/80 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Shield size={16} strokeWidth={2} className="text-slate-400" />
                    <h3 className="font-semibold text-slate-900 text-sm">Branch Admins</h3>
                </div>
                <button
                    onClick={() => setIsAssignModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors shadow-sm"
                >
                    <Plus size={14} strokeWidth={2} />
                    Assign Admin
                </button>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                        <tr>
                            <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider">Name</th>
                            <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider">Email</th>
                            <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-center">Status</th>
                            <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-center">Role</th>
                            <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider">Last Login</th>
                            <th className="px-5 py-3 text-xs font-medium uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.map((admin, i) => (
                            <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                                <td className="px-5 py-3 text-sm font-medium text-slate-900">{admin.name}</td>
                                <td className="px-5 py-3 text-sm text-slate-600">{admin.email}</td>
                                <td className="px-5 py-3 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                        <span className={`w-2 h-2 rounded-full ${admin.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                        <span className="text-xs font-medium text-slate-600">{admin.status}</span>
                                    </div>
                                </td>
                                <td className="px-5 py-3 text-center text-sm text-slate-600 capitalize">
                                    {admin.role.replace('_', ' ')}
                                </td>
                                <td className="px-5 py-3 text-slate-500 text-xs">
                                    {admin.last_login && admin.last_login !== 'Never' 
                                        ? new Date(admin.last_login).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) 
                                        : 'Never'}
                                </td>
                                <td className="px-5 py-3 text-right">
                                    <button
                                        onClick={() => setResetAdmin(admin)}
                                        title="Reset Password"
                                        className="p-1.5 text-slate-400 hover:text-slate-900 transition-colors"
                                    >
                                        <Key size={14} strokeWidth={2} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-10 text-center">
                                    <div className="flex flex-col items-center justify-center text-center">
                                        <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
                                            <Shield size={16} strokeWidth={2} className="text-slate-400" />
                                        </div>
                                        <p className="text-sm font-medium text-slate-900 mb-0.5">No branch admins assigned</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <AssignAdminModal 
                branchId={branchId}
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                onSuccess={loadAdmins}
            />

            <ResetAdminPasswordModal
                branchId={branchId}
                admin={resetAdmin}
                isOpen={!!resetAdmin}
                onClose={() => setResetAdmin(null)}
            />
        </div>
    );
}
