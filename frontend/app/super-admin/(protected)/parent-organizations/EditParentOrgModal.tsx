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
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Edit Parent Organization</h3>
                
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Organization Name</label>
                        <input
                            type="text"
                            required
                            value={formData.name || ""}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Slug (URL identifier)</label>
                        <input
                            type="text"
                            required
                            value={formData.slug || ""}
                            onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Contact Email</label>
                        <input
                            type="email"
                            value={formData.contact_email || ""}
                            onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Contact Phone</label>
                        <input
                            type="text"
                            value={formData.contact_phone || ""}
                            onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                        <input
                            type="checkbox"
                            checked={formData.is_active}
                            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                        />
                        <div>
                            <div className="text-sm font-medium text-slate-900">Active Status</div>
                            <div className="text-xs text-slate-500">Allow logins for this organization</div>
                        </div>
                    </label>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
