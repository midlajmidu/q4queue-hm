"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";

type BranchBackupItem = {
    id: string;
    filename: string;
    size_bytes: number;
    status: string;
    created_at: string;
};

export default function BranchBackupsPage() {
    const params = useParams();
    const router = useRouter();
    const branchId = params.branchId as string;

    const [backups, setBackups] = useState<BranchBackupItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    
    // Restore state
    const [isRestoring, setIsRestoring] = useState(false);
    const [restoreError, setRestoreError] = useState<string | null>(null);
    const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadBackups = async () => {
        if (!branchId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await api.listBranchBackups(branchId);
            setBackups(data.items);
        } catch (err) {
            setError(err instanceof ApiError ? err.detail : "Failed to load backups");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBackups();
    }, [branchId]);

    const handleCreateBackup = async () => {
        if (!confirm("Create a new snapshot for this branch?")) return;
        setIsCreating(true);
        try {
            await api.createBranchBackup(branchId);
            await loadBackups();
        } catch (err) {
            alert(err instanceof ApiError ? err.detail : "Failed to create backup");
        } finally {
            setIsCreating(false);
        }
    };

    const handleRestoreClick = () => {
        if (confirm("WARNING: Restoring will overwrite all current branch data. Make sure you have uploaded the correct .q4branchbackup file. Continue?")) {
            fileInputRef.current?.click();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setIsRestoring(true);
        setRestoreError(null);
        setRestoreSuccess(null);
        
        try {
            const result = await api.restoreBranchBackup(branchId, file);
            setRestoreSuccess(result.message || "Branch restored successfully.");
            await loadBackups();
        } catch (err) {
            setRestoreError(err instanceof ApiError ? err.detail : "Failed to restore backup");
        } finally {
            setIsRestoring(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    return (
        <div className="max-w-4xl space-y-6">
            <button
                onClick={() => router.push(`/super-admin/organizations/${branchId}`)}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group"
            >
                <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                Back to Branch Details
            </button>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Branch Data Snapshots</h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Isolated point-in-time backups for this branch only.
                    </p>
                </div>
                <button
                    onClick={handleCreateBackup}
                    disabled={isCreating}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors shadow-lg shadow-violet-600/20"
                >
                    {isCreating ? (
                        <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
                    )}
                    Create Snapshot
                </button>
            </div>

            {/* Restore Section */}
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-6 shadow-xl">
                <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    Restore from File
                </h2>
                <p className="text-sm text-slate-400 mb-4">
                    Upload a previously downloaded <code className="text-violet-300">.q4branchbackup</code> file to overwrite this branch's data. A safety snapshot will automatically be created before restoration.
                </p>
                
                {restoreError && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
                        {restoreError}
                    </div>
                )}
                {restoreSuccess && (
                    <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-lg">
                        {restoreSuccess}
                    </div>
                )}

                <input 
                    type="file" 
                    ref={fileInputRef}
                    accept=".q4branchbackup"
                    className="hidden"
                    onChange={handleFileChange}
                />
                
                <button
                    onClick={handleRestoreClick}
                    disabled={isRestoring}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
                >
                    {isRestoring ? (
                        <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                    )}
                    Select & Restore Backup
                </button>
            </div>

            <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden shadow-xl">
                {loading ? (
                    <div className="p-8 text-center text-slate-400 animate-pulse">Loading backups...</div>
                ) : error ? (
                    <div className="p-8 text-center text-red-400">{error}</div>
                ) : backups.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
                            <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-white mb-1">No Snapshots Found</h3>
                        <p className="text-sm text-slate-400">Click "Create Snapshot" to back up branch data.</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900/50 border-b border-slate-700/50">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">File Name</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider w-32">Size</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider w-32">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider w-48">Created At</th>
                                <th className="px-6 py-4 w-24 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {backups.map(b => (
                                <tr key={b.id} className="hover:bg-slate-700/20 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-mono">
                                        <div className="flex items-center gap-2">
                                            {b.filename.startsWith("SAFETY_") && (
                                                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[10px] uppercase font-bold rounded-full border border-amber-500/20">
                                                    Safety
                                                </span>
                                            )}
                                            {b.filename}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                        {formatBytes(b.size_bytes)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {b.status === "success" ? (
                                            <span className="text-emerald-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Success</span>
                                        ) : b.status === "pending" ? (
                                            <span className="text-amber-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> Pending</span>
                                        ) : (
                                            <span className="text-red-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Failed</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                        {new Date(b.created_at).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        {b.status === "success" && (
                                            <a
                                                href={`/api/v1/super-admin/branches/${branchId}/backups/${b.id}/download`}
                                                download={b.filename}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded-lg transition-colors"
                                                title="Download Snapshot"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                Download
                                            </a>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
