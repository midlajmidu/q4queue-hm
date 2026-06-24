"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ParentOrganization, OrgDetail, User } from "@/types/api";
import { api } from "@/lib/api";
import { ChevronDown, ChevronRight, Edit2, Shield, Users, Trash2 } from "lucide-react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import AssignBranchesModal from "./AssignBranchesModal";
import CreateOrgAdminModal from "./CreateOrgAdminModal";
import EditParentOrgModal from "./EditParentOrgModal";

interface Props {
    parent: ParentOrganization;
    onRefresh: () => void;
}

export default function ParentOrgRow({ parent, onRefresh }: Props) {
    const [expanded, setExpanded] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Details
    const [branches, setBranches] = useState<OrgDetail[]>([]);
    const [orgAdmins, setOrgAdmins] = useState<User[]>([]);

    // Modals
    const [isAssignBranchesModalOpen, setIsAssignBranchesModalOpen] = useState(false);
    const [isCreateAdminModalOpen, setIsCreateAdminModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const toggleExpand = async () => {
        if (!expanded) {
            setLoading(true);
            try {
                const [b, a] = await Promise.all([
                    api.getParentBranches(parent.id),
                    api.getParentAdmins(parent.id)
                ]);
                setBranches(b);
                setOrgAdmins(a);
            } catch (err) {
                console.error("Failed to load details", err);
            } finally {
                setLoading(false);
            }
        }
        setExpanded(!expanded);
    };

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${parent.name}? This will unassign all its branches.`)) return;
        try {
            await api.deleteParentOrganization(parent.id);
            toast.success("Parent Organization deleted");
            onRefresh();
        } catch (err: any) {
            toast.error(err.detail || "Failed to delete parent organization");
        }
    };

    return (
        <>
            <tr className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                    <button 
                        onClick={toggleExpand}
                        className="flex items-center gap-3 text-left focus:outline-none"
                    >
                        <div className="text-slate-400 hover:text-indigo-600 transition-colors">
                            {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </div>
                        <div>
                            <div className="text-sm font-medium text-slate-900">{parent.name}</div>
                            <div className="text-xs text-slate-500">{parent.contact_email} {parent.contact_phone && `• ${parent.contact_phone}`}</div>
                        </div>
                    </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {parent.slug}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${parent.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-800"}`}>
                        {parent.is_active ? "Active" : "Inactive"}
                    </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <button 
                        onClick={() => setIsEditModalOpen(true)}
                        className="text-slate-500 hover:text-slate-700"
                        title="Edit Details"
                    >
                        <Edit2 size={16} />
                    </button>
                    <button 
                        onClick={() => setIsAssignBranchesModalOpen(true)}
                        className="text-indigo-600 hover:text-indigo-900"
                    >
                        Assign Branch
                    </button>
                    <button 
                        onClick={() => setIsCreateAdminModalOpen(true)}
                        className="text-indigo-600 hover:text-indigo-900"
                    >
                        Add Admin
                    </button>
                    <button 
                        onClick={handleDelete}
                        className="text-red-500 hover:text-red-700"
                        title="Delete Organization"
                    >
                        <Trash2 size={16} />
                    </button>
                </td>
            </tr>

            {expanded && (
                <tr className="bg-slate-50 border-b border-slate-200">
                    <td colSpan={4} className="px-6 py-4">
                        {loading ? (
                            <div className="flex justify-center py-4"><LoadingSpinner /></div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2">
                                {/* Assigned Branch Section */}
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                    <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
                                        <BuildingIcon />
                                        <h4 className="font-bold text-slate-900 text-sm">Assigned Branch</h4>
                                    </div>
                                    {branches.length === 0 ? (
                                        <p className="text-xs text-slate-500 italic">No branch currently assigned.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {branches.map(b => (
                                                <div key={b.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-800">{b.name}</p>
                                                        <p className="text-xs text-slate-500">Slug: {b.slug}</p>
                                                    </div>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${b.is_active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                                                        {b.is_active ? "Active" : "Inactive"}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Organization Admins Section */}
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                    <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
                                        <Shield size={16} className="text-indigo-500" />
                                        <h4 className="font-bold text-slate-900 text-sm">Organization Admins</h4>
                                    </div>
                                    {orgAdmins.length === 0 ? (
                                        <p className="text-xs text-slate-500 italic">No organization admins created yet.</p>
                                    ) : (
                                        <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                                            {orgAdmins.map(a => (
                                                <div key={a.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-800">{a.first_name} {a.last_name}</p>
                                                        <p className="text-xs text-slate-500">{a.email}</p>
                                                    </div>
                                                    <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-medium uppercase">
                                                        Admin
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </td>
                </tr>
            )}

            {isAssignBranchesModalOpen && (
                <AssignBranchesModal 
                    parentOrg={parent}
                    isOpen={isAssignBranchesModalOpen} 
                    onClose={() => setIsAssignBranchesModalOpen(false)} 
                />
            )}

            {isCreateAdminModalOpen && (
                <CreateOrgAdminModal 
                    parentOrg={parent}
                    isOpen={isCreateAdminModalOpen} 
                    onClose={() => setIsCreateAdminModalOpen(false)} 
                />
            )}

            {isEditModalOpen && (
                <EditParentOrgModal
                    parentOrg={parent}
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSuccess={onRefresh}
                />
            )}
        </>
    );
}

// Inline building icon to avoid importing Building2 if it causes issues
function BuildingIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500">
            <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
            <path d="M9 22v-4h6v4"></path>
            <path d="M8 6h.01"></path>
            <path d="M16 6h.01"></path>
            <path d="M12 6h.01"></path>
            <path d="M12 10h.01"></path>
            <path d="M12 14h.01"></path>
            <path d="M16 10h.01"></path>
            <path d="M16 14h.01"></path>
            <path d="M8 10h.01"></path>
            <path d="M8 14h.01"></path>
        </svg>
    )
}
