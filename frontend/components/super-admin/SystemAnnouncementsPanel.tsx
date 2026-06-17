"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { SystemAnnouncementDetail, SystemAnnouncementCreate } from "@/types/api";

export default function SystemAnnouncementsPanel() {
    const [announcements, setAnnouncements] = useState<SystemAnnouncementDetail[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [form, setForm] = useState<SystemAnnouncementCreate>({
        message: "",
        type: "info",
        is_active: true
    });

    const loadAnnouncements = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await api.getSystemAnnouncements(20, 0);
            setAnnouncements(data.items);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAnnouncements();
    }, [loadAnnouncements]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        try {
            await api.createSystemAnnouncement(form);
            setForm({ message: "", type: "info", is_active: true });
            loadAnnouncements();
        } catch (err: any) {
            setError(err.message || "Failed to create announcement");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggle = async (id: string, currentStatus: boolean) => {
        try {
            await api.updateSystemAnnouncement(id, { is_active: !currentStatus });
            loadAnnouncements();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this announcement?")) return;
        try {
            await api.deleteSystemAnnouncement(id);
            loadAnnouncements();
        } catch (err) {
            console.error(err);
        }
    };

    const getTypeColor = (type: string) => {
        if (type === "info") return "bg-blue-500/10 text-blue-400 border-blue-500/20";
        if (type === "warning") return "bg-amber-500/10 text-amber-400 border-amber-500/20";
        if (type === "critical") return "bg-red-500/10 text-red-400 border-red-500/20";
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    };

    return (
        <div className="bg-slate-900 rounded-2xl border border-white/10 shadow-xl overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                    Global Broadcasts
                </h2>
            </div>
            
            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Create Form */}
                <div className="lg:col-span-1 space-y-4">
                    <h3 className="text-sm font-medium text-slate-300">New Broadcast</h3>
                    {error && <div className="text-xs text-red-400 bg-red-500/10 p-2 rounded">{error}</div>}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <textarea 
                                value={form.message} 
                                onChange={(e) => setForm(f => ({ ...f, message: e.target.value }))}
                                placeholder="Enter announcement message..." 
                                required
                                rows={3}
                                className="w-full rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 px-3.5 py-2.5 text-sm focus:border-violet-500 focus:ring-1 focus:ring-violet-500 focus:outline-none transition-colors resize-none"
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <select 
                                value={form.type} 
                                onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}
                                className="flex-1 rounded-xl bg-slate-950 border border-slate-800 text-white px-3.5 py-2.5 text-sm focus:border-violet-500 focus:outline-none"
                            >
                                <option value="info">Info (Blue)</option>
                                <option value="warning">Warning (Amber)</option>
                                <option value="critical">Critical (Red)</option>
                            </select>
                            
                            <button 
                                type="submit" 
                                disabled={isSubmitting || !form.message.trim()}
                                className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
                            >
                                {isSubmitting ? "Sending..." : "Broadcast"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* List */}
                <div className="lg:col-span-2">
                    {isLoading ? (
                        <div className="animate-pulse space-y-3">
                            <div className="h-16 bg-slate-800 rounded-xl" />
                            <div className="h-16 bg-slate-800 rounded-xl" />
                        </div>
                    ) : announcements.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 border border-dashed border-slate-700 rounded-xl py-8">
                            <svg className="w-8 h-8 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                            <p className="text-sm">No announcements broadcasted yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                            {announcements.map((a) => (
                                <div key={a.id} className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-colors ${a.is_active ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-900/50 border-slate-800 opacity-60'}`}>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getTypeColor(a.type)}`}>
                                                {a.type}
                                            </span>
                                            <span className="text-xs text-slate-500">
                                                {new Date(a.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-200 truncate">{a.message}</p>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <button 
                                            onClick={() => handleToggle(a.id, a.is_active)}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${a.is_active ? "bg-emerald-500" : "bg-slate-600"}`}
                                        >
                                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${a.is_active ? "translate-x-5" : "translate-x-1"}`} />
                                        </button>
                                        <button onClick={() => handleDelete(a.id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
