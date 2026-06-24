"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Save, Building2, Globe, Palette } from "lucide-react";

export default function OrganizationSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [formData, setFormData] = useState({
        name: "",
        contact_email: "",
        contact_phone: "",
        address: "",
        timezone: "UTC",
        logo_url: "",
        brand_color: "#4f46e5",
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await api.getOrgAdminSettings();
                setFormData({
                    name: data.name || "",
                    contact_email: data.contact_email || "",
                    contact_phone: data.contact_phone || "",
                    address: data.address || "",
                    timezone: data.timezone || "UTC",
                    logo_url: data.logo_url || "",
                    brand_color: data.brand_color || "#4f46e5",
                });
            } catch (err: any) {
                toast.error("Failed to load organization settings");
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.updateOrgAdminSettings(formData);
            toast.success("Organization settings updated successfully!");
        } catch (err: any) {
            toast.error("Failed to update settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading settings...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Organization Settings</h1>
                <p className="text-slate-500 mt-1">Manage global settings for your enterprise and all branches.</p>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 text-indigo-600">
                        <Building2 size={20} />
                        <h2 className="text-lg font-semibold text-slate-900">General Information</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Organization Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Contact Email</label>
                            <input
                                type="email"
                                value={formData.contact_email}
                                onChange={(e) => setFormData({...formData, contact_email: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Contact Phone</label>
                            <input
                                type="text"
                                value={formData.contact_phone}
                                onChange={(e) => setFormData({...formData, contact_phone: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Head Office Address</label>
                            <textarea
                                value={formData.address}
                                onChange={(e) => setFormData({...formData, address: e.target.value})}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                rows={2}
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 text-indigo-600">
                        <Palette size={20} />
                        <h2 className="text-lg font-semibold text-slate-900">Branding & Identity</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Logo URL</label>
                            <input
                                type="url"
                                value={formData.logo_url}
                                onChange={(e) => setFormData({...formData, logo_url: e.target.value})}
                                placeholder="https://example.com/logo.png"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Brand Color</label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="color"
                                    value={formData.brand_color}
                                    onChange={(e) => setFormData({...formData, brand_color: e.target.value})}
                                    className="h-10 w-10 border border-slate-300 rounded cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={formData.brand_color}
                                    onChange={(e) => setFormData({...formData, brand_color: e.target.value})}
                                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 text-indigo-600">
                        <Globe size={20} />
                        <h2 className="text-lg font-semibold text-slate-900">Localization</h2>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Default Timezone</label>
                        <select
                            value={formData.timezone}
                            onChange={(e) => setFormData({...formData, timezone: e.target.value})}
                            className="w-full md:w-1/2 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="UTC">UTC</option>
                            <option value="America/New_York">Eastern Time (US & Canada)</option>
                            <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                            <option value="Europe/London">London</option>
                            <option value="Asia/Dubai">Dubai</option>
                            <option value="Asia/Kolkata">India Standard Time</option>
                        </select>
                        <p className="text-xs text-slate-500 mt-2">New branches will default to this timezone.</p>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                        <Save size={18} />
                        {saving ? "Saving..." : "Save Settings"}
                    </button>
                </div>
            </form>
        </div>
    );
}
