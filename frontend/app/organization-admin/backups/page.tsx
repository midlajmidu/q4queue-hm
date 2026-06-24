"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Database, AlertCircle, History, UploadCloud, CheckCircle2, XCircle, Clock, Download } from "lucide-react";

export default function OrganizationBackupsPage() {
    const [backups, setBackups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [restoreConfirmText, setRestoreConfirmText] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchBackups = async () => {
        try {
            const data = await api.getOrgAdminBackups();
            setBackups(data);
        } catch (err: any) {
            toast.error("Failed to load backups");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBackups();
    }, []);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith(".q4backup")) {
            toast.error("Invalid file type. Please select a .q4backup file.");
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        if (restoreConfirmText !== "RESTORE ORGANIZATION") {
            toast.error("Please type RESTORE ORGANIZATION first to confirm.");
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        setUploading(true);
        try {
            const res = await api.restoreOrgAdminBackup(file);
            toast.success(res.message || "Restore initiated.");
            setRestoreConfirmText("");
        } catch (err: any) {
            toast.error(err.message || "Failed to restore backup");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleDownload = async (backupId: string) => {
        try {
            toast.info("Preparing download...");
            await api.downloadOrgAdminBackup(backupId);
        } catch (err: any) {
            toast.error(err.message || "Failed to download backup");
        }
    };

    const formatBytes = (bytes: number, decimals = 2) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Backup Center</h1>
                    <p className="text-slate-500 mt-1">Manage organization-level backups and restore points.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Status Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-4">
                        <Database size={20} className="text-indigo-600" />
                        Automated Backup Status
                    </h2>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                            <span className="text-slate-500">Last Backup Status</span>
                            {backups.length > 0 ? (
                                backups[0].status === "success" ? (
                                    <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                        <CheckCircle2 size={16} /> Success
                                    </span>
                                ) : backups[0].status === "pending" ? (
                                    <span className="flex items-center gap-1 text-amber-600 font-medium">
                                        <Clock size={16} /> In Progress
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-red-600 font-medium">
                                        <XCircle size={16} /> Failed
                                    </span>
                                )
                            ) : (
                                <span className="text-slate-400">Never</span>
                            )}
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                            <span className="text-slate-500">Last Backup Time</span>
                            <span className="font-medium text-slate-900">
                                {backups.length > 0 ? new Date(backups[0].created_at).toLocaleString() : "N/A"}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-100">
                            <span className="text-slate-500">Next Scheduled</span>
                            <span className="font-medium text-slate-900">Tomorrow at 03:00 AM</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <span className="text-slate-500">Stored Backups</span>
                            <span className="font-medium text-slate-900">{backups.length} (Max 30)</span>
                        </div>
                    </div>
                </div>

                {/* Restore Card */}
                <div className="bg-red-50 rounded-xl border border-red-200 p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-red-700 flex items-center gap-2 mb-2">
                        <AlertCircle size={20} />
                        Import & Restore Backup
                    </h2>
                    <p className="text-red-600 text-sm mb-6">
                        WARNING: This action will permanently replace all current organization data with the uploaded backup. A safety backup will automatically run first.
                    </p>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-red-800 mb-1">
                                Type RESTORE ORGANIZATION to unlock
                            </label>
                            <input
                                type="text"
                                value={restoreConfirmText}
                                onChange={(e) => setRestoreConfirmText(e.target.value)}
                                className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                                placeholder="RESTORE ORGANIZATION"
                            />
                        </div>
                        
                        <input
                            type="file"
                            accept=".q4backup"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading || restoreConfirmText !== "RESTORE ORGANIZATION"}
                            className="w-full flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {uploading ? (
                                "Uploading & Restoring..."
                            ) : (
                                <>
                                    <UploadCloud size={18} />
                                    Import Backup File
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* History Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                        <History size={20} className="text-slate-600" />
                        Backup History
                    </h2>
                    <button onClick={fetchBackups} className="text-indigo-600 text-sm hover:underline font-medium">
                        Refresh
                    </button>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="p-4 font-medium text-slate-500 text-sm">Date</th>
                                <th className="p-4 font-medium text-slate-500 text-sm">File Name</th>
                                <th className="p-4 font-medium text-slate-500 text-sm">Size</th>
                                <th className="p-4 font-medium text-slate-500 text-sm">Status</th>
                                <th className="p-4 font-medium text-slate-500 text-sm text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">Loading...</td>
                                </tr>
                            ) : backups.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">
                                        No backups found yet. The first automated backup runs at 03:00 AM.
                                    </td>
                                </tr>
                            ) : (
                                backups.map((b) => (
                                    <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 text-slate-900 text-sm">
                                            {new Date(b.created_at).toLocaleString(undefined, {
                                                day: 'numeric', month: 'short', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </td>
                                        <td className="p-4 font-mono text-sm text-slate-600">
                                            {b.filename}
                                        </td>
                                        <td className="p-4 text-sm text-slate-600">
                                            {formatBytes(b.size_bytes)}
                                        </td>
                                        <td className="p-4">
                                            {b.status === 'success' && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Success</span>}
                                            {b.status === 'pending' && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">In Progress</span>}
                                            {b.status === 'failed' && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Failed</span>}
                                        </td>
                                        <td className="p-4 text-right">
                                            {b.status === 'success' && (
                                                <button
                                                    onClick={() => handleDownload(b.id)}
                                                    className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Download Backup"
                                                >
                                                    <Download size={18} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
