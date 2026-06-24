"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { ParentOrganization, OrgDetail, User } from "@/types/api";
import { api } from "@/lib/api";
import { ChevronDown, ChevronRight, Edit2, Shield, Users, Trash2, Link, UserPlus, Key } from "lucide-react";
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
            <tr onClick={toggleExpand} className="hover:bg-white/5 transition-colors cursor-pointer group">
                <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3 text-left">
                        <div className="text-slate-400 group-hover:text-indigo-400 transition-colors">
                            {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        </div>
                        <div>
                            <div className="text-sm font-bold text-white">{parent.name}</div>
                            <div className="text-xs font-medium text-slate-400">{parent.contact_email} {parent.contact_phone && `• ${parent.contact_phone}`}</div>
                        </div>
                    </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-4">
                        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/50 px-2.5 py-1 rounded-md shadow-sm">
                            <BuildingIcon />
                            <span className="text-xs text-slate-300"><span className="font-bold text-slate-100">{parent.branch_count || 0}</span> {parent.branch_count === 1 ? "Branch" : "Branches"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/50 px-2.5 py-1 rounded-md shadow-sm">
                            <Shield size={12} className="text-indigo-400" />
                            <span className="text-xs text-slate-300"><span className="font-bold text-slate-100">{parent.admin_count || 0}</span> {parent.admin_count === 1 ? "Admin" : "Admins"}</span>
                        </div>
                    </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border shadow-sm ${parent.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-slate-800 text-slate-400 border-slate-700"}`}>
                        {parent.is_active ? "Active" : "Inactive"}
                    </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-1.5">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsEditModalOpen(true); }}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                            title="Edit Details"
                        >
                            <Edit2 size={16} />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsAssignBranchesModalOpen(true); }}
                            className="p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-all"
                            title="Assign Branch"
                        >
                            <Link size={16} />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsCreateAdminModalOpen(true); }}
                            className="p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-all"
                            title="Add Admin"
                        >
                            <UserPlus size={16} />
                        </button>
                        <div className="w-px h-4 bg-slate-700/50 mx-1"></div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Delete Organization"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </td>
            </tr>

            {expanded && (
                <tr className="bg-slate-800/40 border-b border-slate-700/50">
                    <td colSpan={4} className="px-6 py-6">
                        {loading ? (
                            <div className="flex justify-center py-4"><LoadingSpinner /></div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2">
                                {/* Assigned Branch Section */}
                                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-700/50 flex flex-col h-full">
                                    <div className="flex items-center gap-2 mb-4 border-b border-slate-700/50 pb-3">
                                        <BuildingIcon />
                                        <h4 className="font-bold text-white text-sm">Assigned Branches</h4>
                                    </div>
                                    <div className="flex-1">
                                        {branches.length === 0 ? (
                                            <p className="text-sm text-slate-500 italic">No branch currently assigned.</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {branches.map(b => (
                                                    <div key={b.id} className="flex justify-between items-center bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/50 shadow-sm hover:bg-slate-800/60 transition-colors group">
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">{b.name}</p>
                                                            <p className="text-xs font-medium text-slate-400 mt-0.5">Slug: {b.slug}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); alert("Test Case: Edit Branch functionality will go here"); }}
                                                                className="p-1 text-slate-400 hover:text-indigo-400 transition-colors"
                                                                title="Edit Branch"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border shadow-sm ${b.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-slate-800 text-slate-400 border-slate-600"}`}>
                                                                {b.is_active ? "Active" : "Inactive"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Organization Admins Section */}
                                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-700/50 flex flex-col h-full">
                                    <div className="flex items-center gap-2 mb-4 border-b border-slate-700/50 pb-3">
                                        <Shield size={18} className="text-indigo-400" />
                                        <h4 className="font-bold text-white text-sm">Organization Admins</h4>
                                    </div>
                                    <div className="flex-1">
                                        {orgAdmins.length === 0 ? (
                                            <p className="text-sm text-slate-500 italic">No organization admins created yet.</p>
                                        ) : (
                                            <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                                {orgAdmins.map(a => (
                                                    <div key={a.id} className="flex justify-between items-center bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/50 shadow-sm hover:bg-slate-800/60 transition-colors group">
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">{a.first_name} {a.last_name}</p>
                                                            <p className="text-xs font-medium text-slate-400 mt-0.5">{a.email}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); alert("Test Case: Edit Admin functionality will go here"); }}
                                                                className="p-1 text-slate-400 hover:text-indigo-400 transition-colors"
                                                                title="Edit Admin"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); alert("Test Case: Reset Admin Password functionality will go here"); }}
                                                                className="p-1 text-slate-400 hover:text-indigo-400 transition-colors"
                                                                title="Reset Password"
                                                            >
                                                                <Key size={14} />
                                                            </button>
                                                            <span className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase shadow-sm">
                                                                Admin
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </td>
                </tr>
            )}

            {isAssignBranchesModalOpen && typeof document !== 'undefined' && createPortal(
                <AssignBranchesModal 
                    parentOrg={parent}
                    isOpen={isAssignBranchesModalOpen} 
                    onClose={() => setIsAssignBranchesModalOpen(false)} 
                />,
                document.body
            )}

            {isCreateAdminModalOpen && typeof document !== 'undefined' && createPortal(
                <CreateOrgAdminModal 
                    parentOrg={parent}
                    isOpen={isCreateAdminModalOpen} 
                    onClose={() => setIsCreateAdminModalOpen(false)} 
                />,
                document.body
            )}

            {isEditModalOpen && typeof document !== 'undefined' && createPortal(
                <EditParentOrgModal
                    parentOrg={parent}
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSuccess={onRefresh}
                />,
                document.body
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
