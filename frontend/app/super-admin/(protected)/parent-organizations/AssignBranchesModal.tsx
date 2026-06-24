"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ParentOrganization, OrgDetail } from "@/types/api";
import { api } from "@/lib/api";

interface Props {
    parentOrg: ParentOrganization;
    isOpen: boolean;
    onClose: () => void;
}

export default function AssignBranchesModal({ parentOrg, isOpen, onClose }: Props) {
    const [allBranches, setAllBranches] = useState<OrgDetail[]>([]);
    const [selectedBranchIds, setSelectedBranchIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load all branches to pick from
            const allResponse = await api.listOrganizations({ limit: 1000 });
            setAllBranches(allResponse.items);

            // Load currently assigned branches
            const assigned = await api.getParentBranches(parentOrg.id);
            if (assigned.length > 0) {
                setSelectedBranchIds(new Set(assigned.map(b => b.id)));
            }
        } catch (err: any) {
            toast.error(err.detail || "Failed to load branches");
        } finally {
            setLoading(false);
        }
    };

    const toggleBranch = (id: string) => {
        const newSet = new Set(selectedBranchIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedBranchIds(newSet);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.assignBranchesToParent(parentOrg.id, {
                branch_ids: Array.from(selectedBranchIds)
            });
            toast.success("Branches assigned successfully");
            onClose();
        } catch (err: any) {
            toast.error(err.detail || "Failed to assign branches");
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6" style={{ maxHeight: "90vh", overflowY: "auto" }}>
                <h3 className="text-lg font-bold text-slate-900 mb-4">Assign Branches to {parentOrg.name}</h3>
                
                {loading ? (
                    <div className="py-8 flex justify-center text-slate-500">Loading branches...</div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">Select which branches belong to this parent organization. You can assign multiple branches, but a branch can only belong to one parent at a time.</p>
                        
                        <div className="border border-slate-200 rounded-lg overflow-y-auto max-h-64 divide-y divide-slate-100">
                            <div className="space-y-2 max-h-96 overflow-y-auto mt-2 pr-2">
                                {allBranches.map((branch) => {
                                    const isAssignedToOther = branch.parent_organization_id && branch.parent_organization_id !== parentOrg.id;
                                    
                                    return (
                                        <label 
                                            key={branch.id} 
                                            className={`flex items-center px-4 py-3 border rounded-lg transition-colors ${
                                                isAssignedToOther 
                                                    ? "opacity-60 cursor-not-allowed bg-slate-50 border-slate-200" 
                                                    : "hover:bg-slate-50 cursor-pointer border-slate-200"
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedBranchIds.has(branch.id)}
                                                disabled={!!isAssignedToOther}
                                                onChange={() => toggleBranch(branch.id)}
                                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 disabled:opacity-50 rounded"
                                            />
                                            <div className="ml-3 flex-1">
                                                <div className="flex justify-between items-center">
                                                    <div className="text-sm font-medium text-slate-900">{branch.name}</div>
                                                    {isAssignedToOther && (
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase bg-slate-200 text-slate-600">
                                                            Already Assigned
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-500">Slug: {branch.slug}</div>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={saving}
                                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {saving ? "Saving..." : "Save Assignments"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
