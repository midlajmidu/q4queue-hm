"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Database, AlertCircle, Play, History, Download } from "lucide-react";

export default function OrganizationBackupsPage() {
    const [loading, setLoading] = useState(false);

    const handleTriggerBackup = async () => {
        setLoading(true);
        try {
            const res = await api.triggerOrgAdminBackup();
            toast.success(res.message || "Backup triggered successfully");
        } catch (err: any) {
            toast.error("Failed to trigger backup");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Backups & Restore</h1>
                    <p className="text-slate-500 mt-1">Manage data backups for your entire organization.</p>
                </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5 flex items-start gap-4">
                <AlertCircle className="text-indigo-600 mt-0.5" size={24} />
                <div>
                    <h3 className="font-semibold text-indigo-900">Automated Daily Backups</h3>
                    <p className="text-indigo-700 text-sm mt-1">
                        Your data is automatically backed up every day at 00:00 UTC. These automated backups are securely stored and retained for 30 days. You can also trigger manual snapshots below.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <Database size={20} className="text-indigo-600" />
                                Manual Snapshot
                            </h2>
                        </div>
                        <p className="text-slate-600 text-sm mb-6">
                            Create an immediate snapshot of all branch data, settings, and audit logs. This operation happens in the background.
                        </p>
                    </div>
                    
                    <button
                        onClick={handleTriggerBackup}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                        {loading ? (
                            "Triggering..."
                        ) : (
                            <>
                                <Play size={18} />
                                Trigger Backup Now
                            </>
                        )}
                    </button>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <History size={20} className="text-slate-600" />
                        Recent Backups
                    </h2>
                    
                    <div className="flex flex-col items-center justify-center h-32 text-center text-slate-500">
                        <p className="text-sm">No manual backups found.</p>
                        <p className="text-xs mt-1">Triggered backups will appear here for download.</p>
                    </div>
                </div>
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mt-8">
                <h2 className="text-lg font-semibold text-red-600 mb-2">Data Restoration</h2>
                <p className="text-slate-600 text-sm mb-4">
                    Restoring from a backup will overwrite current data. This action is irreversible and requires Super Admin assistance.
                </p>
                <button className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
                    Request Data Restore
                </button>
            </div>
        </div>
    );
}
