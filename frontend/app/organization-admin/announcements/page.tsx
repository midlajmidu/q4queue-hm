"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Megaphone, Plus, Search, AlertTriangle, Info, ShieldAlert } from "lucide-react";

export default function OrganizationAnnouncementsPage() {
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    
    const [formData, setFormData] = useState({
        title: "",
        message: "",
        type: "info",
    });

    const fetchAnnouncements = async () => {
        try {
            const data = await api.getOrgAdminAnnouncements();
            setAnnouncements(data);
        } catch (err: any) {
            toast.error("Failed to load announcements");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.createOrgAdminAnnouncement(formData);
            toast.success("Announcement created successfully");
            setShowModal(false);
            setFormData({ title: "", message: "", type: "info" });
            fetchAnnouncements();
        } catch (err: any) {
            toast.error("Failed to create announcement");
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "critical": return <ShieldAlert size={18} className="text-rose-500" />;
            case "warning": return <AlertTriangle size={18} className="text-amber-500" />;
            default: return <Info size={18} className="text-indigo-500" />;
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Organization Announcements</h1>
                    <p className="text-slate-500 mt-1">Broadcast messages to all branch dashboards.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    <Plus size={18} />
                    New Announcement
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-slate-500">Loading announcements...</div>
            ) : announcements.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                    <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Megaphone size={24} className="text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No announcements yet</h3>
                    <p className="text-slate-500">Create your first announcement to broadcast to branches.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {announcements.map((ann) => (
                        <div key={ann.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition-shadow">
                            <div className="flex items-start justify-between">
                                <div className="flex gap-3">
                                    <div className="mt-1">{getTypeIcon(ann.type)}</div>
                                    <div>
                                        <h3 className="text-lg font-medium text-slate-900">{ann.title}</h3>
                                        <p className="text-slate-600 mt-1">{ann.message}</p>
                                        <div className="flex items-center gap-4 mt-3 text-sm text-slate-400">
                                            <span>{new Date(ann.created_at).toLocaleString()}</span>
                                            <span className="capitalize px-2 py-0.5 bg-slate-100 rounded-full text-xs font-medium text-slate-600 border border-slate-200">
                                                {ann.type}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <span className={`w-2 h-2 rounded-full ${ann.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                                                {ann.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="p-6 border-b border-slate-100">
                            <h2 className="text-xl font-semibold text-slate-900">Create Announcement</h2>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="e.g., System Maintenance Tomorrow"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="info">Information (Blue)</option>
                                    <option value="warning">Warning (Yellow)</option>
                                    <option value="critical">Critical (Red)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                                <textarea
                                    required
                                    value={formData.message}
                                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24"
                                    placeholder="Enter the announcement details..."
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    Broadcast
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
