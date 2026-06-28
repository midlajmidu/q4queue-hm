"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { KeyRound, UserPlus } from "lucide-react";
import CreateBranchAdminModal from "@/components/organization-admin/CreateBranchAdminModal";
import ResetPasswordModal from "@/components/organization-admin/ResetPasswordModal";

export default function BranchAdminsList({ branchId }: { branchId: string }) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [resetProps, setResetProps] = useState<any>(null);

    const loadData = () => {
        setLoading(true);
        api.getBranchAdminsOverview(branchId).then(setData).finally(() => setLoading(false));
    };

    useEffect(() => { loadData(); }, [branchId]);

    if (loading) return <div className="h-40 bg-slate-100 animate-pulse rounded-xl"></div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h2 className="font-semibold text-slate-900">Branch Admins & Staff</h2>
                <button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-1 text-xs bg-indigo-600 text-white px-2 py-1 rounded">
                    <UserPlus size={14} /> Add Admin
                </button>
            </div>
            <div className="divide-y divide-slate-100">
                {data.map((admin, i) => (
                    <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50">
                        <div>
                            <div className="flex items-center gap-2">
                                <div className="font-medium text-slate-900 text-sm">{admin.name}</div>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                                    admin.role === "staff" 
                                    ? "bg-slate-100 text-slate-700 border-slate-200" 
                                    : "bg-indigo-50 text-indigo-700 border-indigo-100"
                                }`}>
                                    {admin.role === "staff" ? "Staff" : "Admin"}
                                </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">{admin.email}</div>
                        </div>
                        <button onClick={() => setResetProps({ id: admin.user_id, name: admin.name })} className="text-orange-600 p-2 hover:bg-orange-50 rounded">
                            <KeyRound size={16} />
                        </button>
                    </div>
                ))}
            </div>
            <CreateBranchAdminModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreated={loadData} branchId={branchId} />
            <ResetPasswordModal isOpen={!!resetProps} onClose={() => setResetProps(null)} branchId={branchId} adminId={resetProps?.id || ''} adminName={resetProps?.name || ''} />
        </div>
    );
}
