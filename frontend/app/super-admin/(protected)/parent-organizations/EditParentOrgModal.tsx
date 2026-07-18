"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ParentOrganization, ParentOrganizationUpdate } from "@/types/api";
import { api } from "@/lib/api";

interface Props {
    parentOrg: ParentOrganization;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function EditParentOrgModal({ parentOrg, isOpen, onClose, onSuccess }: Props) {
    const [formData, setFormData] = useState<ParentOrganizationUpdate>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormData({
                name: parentOrg.name,
                slug: parentOrg.slug,
                contact_email: parentOrg.contact_email || "",
                contact_phone: parentOrg.contact_phone || "",
                is_active: parentOrg.is_active,
                max_branches: parentOrg.max_branches || null,
            });
        }
    }, [isOpen, parentOrg]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.updateParentOrganization(parentOrg.id, formData);
            toast.success("Organization updated successfully");
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.detail || "Failed to update organization");
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-slate-900 border border-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                <h3 className="text-lg font-bold text-white mb-4">Edit Parent Organization</h3>

                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Organization Name</label>
                        <input
                            type="text"
                            required
                            value={formData.name || ""}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-sm text-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Slug (URL identifier)</label>
                        <input
                            type="text"
                            required
                            value={formData.slug || ""}
                            onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                            className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-sm text-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Contact Email</label>
                        <input
                            type="email"
                            value={formData.contact_email || ""}
                            onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-sm text-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Contact Phone</label>
                        <input
                            type="text"
                            value={formData.contact_phone || ""}
                            onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-sm text-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Branch Limit (Optional)</label>
                        <input
                            type="number"
                            min="1"
                            value={formData.max_branches || ""}
                            onChange={(e) => setFormData({ ...formData, max_branches: e.target.value ? parseInt(e.target.value) : null })}
                            className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-lg text-sm text-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            placeholder="Leave empty for unlimited"
                        />
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-950/50 border border-slate-800 rounded-lg hover:bg-white/5 transition-colors">
                        <input
                            type="checkbox"
                            checked={formData.is_active || false}
                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500/20 bg-slate-950 border-slate-700 rounded"
                        />
                        <div>
                            <div className="text-sm font-medium text-slate-200">Active Status</div>
                            <div className="text-xs text-slate-400">Allow logins for this organization</div>
                        </div>
                    </label>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all duration-200"
                        >
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
