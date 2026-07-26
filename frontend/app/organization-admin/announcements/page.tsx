"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Megaphone, Plus, Search, AlertTriangle, Info, ShieldAlert, Edit2, Trash2 } from "lucide-react";

export default function OrganizationAnnouncementsPage() {
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        title: "",
        message: "",
        type: "info",
        start_time: "",
        end_time: "",
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

    const handleCreateOrUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                title: formData.title,
                message: formData.message,
                type: formData.type,
                start_time: formData.start_time ? new Date(formData.start_time).toISOString() : null,
                end_time: formData.end_time ? new Date(formData.end_time).toISOString() : null,
            };

            if (editingId) {
                await api.updateOrgAdminAnnouncement(editingId, payload);
                toast.success("Announcement updated successfully");
            } else {
                await api.createOrgAdminAnnouncement(payload);
                toast.success("Announcement created successfully");
            }
            setShowModal(false);
            setEditingId(null);
            setFormData({ title: "", message: "", type: "info", start_time: "", end_time: "" });
            fetchAnnouncements();
        } catch (err: any) {
            toast.error(editingId ? "Failed to update announcement" : "Failed to create announcement");
        }
    };

    const handleEdit = (ann: any) => {
        setEditingId(ann.id);
        setFormData({
            title: ann.title,
            message: ann.message,
            type: ann.type,
            start_time: ann.start_time ? new Date(ann.start_time).toISOString().slice(0, 16) : "",
            end_time: ann.end_time ? new Date(ann.end_time).toISOString().slice(0, 16) : "",
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this announcement?")) return;
        try {
            await api.deleteOrgAdminAnnouncement(id);
            toast.success("Announcement deleted successfully");
            fetchAnnouncements();
        } catch (err: any) {
            toast.error("Failed to delete announcement");
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
        <div className="space-y-6">
            {/* Premium Header & Controls */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-6 pb-6 border-b border-slate-200/60">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500">
                        Organization Announcements
                    </h1>
                    <div className="flex items-center flex-wrap gap-2.5 text-sm text-slate-500 mt-2">
                        <span className="leading-none font-medium text-slate-500">Broadcast messages to all branch dashboards.</span>
                    </div>
                </div>
                <button
                    onClick={() => {
                        setEditingId(null);
                        setFormData({ title: "", message: "", type: "info", start_time: "", end_time: "" });
                        setShowModal(true);
                    }}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
                >
                    <Plus size={16} />
                    New Announcement
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-slate-500 text-sm">Loading announcements...</div>
            ) : announcements.length === 0 ? (
                <div className="bg-white rounded-lg border border-slate-200 p-12 text-center shadow-sm">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                        <Megaphone size={20} className="text-slate-400" />
                    </div>
                    <h3 className="text-base font-medium text-slate-900 mb-1">No announcements yet</h3>
                    <p className="text-sm text-slate-500">Create your first announcement to broadcast to branches.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {announcements.map((ann) => (
                        <div key={ann.id} className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-colors group">
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                <div className="flex gap-4">
                                    <div className="mt-0.5 shrink-0">{getTypeIcon(ann.type)}</div>
                                    <div>
                                        <h3 className="text-base font-semibold text-slate-900">{ann.title}</h3>
                                        <p className="text-sm text-slate-600 mt-1">{ann.message}</p>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-xs text-slate-500">
                                            <span>Created {new Date(ann.created_at).toLocaleDateString()}</span>
                                            {ann.start_time && (
                                                <span className="text-slate-650">Start: {new Date(ann.start_time).toLocaleDateString()}</span>
                                            )}
                                            {ann.end_time && (
                                                <span className="text-slate-650">End: {new Date(ann.end_time).toLocaleDateString()}</span>
                                            )}
                                            <span className="capitalize px-2 py-0.5 bg-slate-50 text-slate-600 rounded border border-slate-200">
                                                {ann.type}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <span className={`w-1.5 h-1.5 rounded-full ${ann.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                                                {ann.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity justify-end sm:justify-start w-full sm:w-auto border-t border-slate-100 sm:border-t-0 pt-3 sm:pt-0 shrink-0">
                                    <button 
                                        onClick={() => handleEdit(ann)}
                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                        title="Edit"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(ann.id)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-lg font-medium text-slate-900">{editingId ? "Edit Announcement" : "Create Announcement"}</h2>
                        </div>
                        <form onSubmit={handleCreateOrUpdate} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="e.g., System Maintenance Tomorrow"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="info">Information</option>
                                    <option value="warning">Warning</option>
                                    <option value="critical">Critical</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Start Time (Optional)</label>
                                    <input
                                        type="datetime-local"
                                        value={formData.start_time}
                                        onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">End Time (Optional)</label>
                                    <input
                                        type="datetime-local"
                                        value={formData.end_time}
                                        onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Message</label>
                                <textarea
                                    required
                                    value={formData.message}
                                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 h-24 resize-none"
                                    placeholder="Enter the announcement details..."
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-sm text-slate-600 font-medium hover:bg-slate-50 rounded-md transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition-colors shadow-sm"
                                >
                                    {editingId ? "Save Changes" : "Broadcast"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
