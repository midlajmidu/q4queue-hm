import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Database, AlertCircle, History, UploadCloud, CheckCircle2, XCircle, Clock, Download, HardDrive } from "lucide-react";

export default function BranchBackupsManager() {
    const [branches, setBranches] = useState<any[]>([]);
    const [selectedBranchId, setSelectedBranchId] = useState<string>("");
    
    const [backups, setBackups] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [restoreConfirmText, setRestoreConfirmText] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Load branches
        api.getOrgAdminBranchesOverview()
            .then(data => {
                setBranches(data || []);
                if (data && data.length > 0) {
                    setSelectedBranchId(data[0].id);
                }
            })
            .catch(err => toast.error("Failed to load branches"));
    }, []);

    const loadBackups = async (branchId: string) => {
        if (!branchId) return;
        setLoading(true);
        try {
            const data = await api.orgAdminListBranchBackups(branchId);
            setBackups(data.items || []);
        } catch (err: any) {
            toast.error("Failed to load branch backups");
            setBackups([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedBranchId) {
            loadBackups(selectedBranchId);
        } else {
            setBackups([]);
        }
    }, [selectedBranchId]);

    const handleCreateBackup = async () => {
        if (!selectedBranchId) return;
        if (!confirm("Create a new snapshot for this branch?")) return;
        
        setIsCreating(true);
        try {
            await api.orgAdminCreateBranchBackup(selectedBranchId);
            toast.success("Snapshot created successfully");
            await loadBackups(selectedBranchId);
        } catch (err: any) {
            toast.error(err.message || "Failed to create backup");
        } finally {
            setIsCreating(false);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedBranchId) return;

        if (!file.name.endsWith(".q4branchbackup")) {
            toast.error("Invalid file type. Please select a .q4branchbackup file.");
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        if (restoreConfirmText !== "RESTORE BRANCH") {
            toast.error("Please type RESTORE BRANCH to confirm.");
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        setIsRestoring(true);
        try {
            const res = await api.orgAdminRestoreBranchBackup(selectedBranchId, file);
            toast.success(res.message || "Branch restored successfully.");
            setRestoreConfirmText("");
        } catch (err: any) {
            toast.error(err.message || "Failed to restore backup");
        } finally {
            setIsRestoring(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
            loadBackups(selectedBranchId);
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
        <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <HardDrive size={20} className="text-indigo-600" />
                            Branch-Level Snapshots
                        </h2>
                        <p className="text-slate-500 text-sm mt-1">Select a branch to manage its isolated point-in-time backups.</p>
                    </div>
                    <div className="flex-shrink-0 w-full sm:w-64">
                        <select 
                            value={selectedBranchId}
                            onChange={(e) => setSelectedBranchId(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {branches.length === 0 && <option value="">No branches available</option>}
                            {branches.map(b => (
                                <option key={b.id} value={b.id}>{b.name} ({b.slug})</option>
                            ))}
                        </select>
                    </div>
                </div>

                {selectedBranchId && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Status Card */}
                        <div className="bg-slate-50 rounded-xl border border-slate-100 p-5">
                            <h3 className="font-semibold text-slate-900 mb-2">Snapshot Management</h3>
                            <p className="text-sm text-slate-500 mb-6">Create instant point-in-time snapshots for this specific branch. These are isolated from other branches.</p>
                            
                            <button
                                onClick={handleCreateBackup}
                                disabled={isCreating}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors shadow-sm"
                            >
                                {isCreating ? (
                                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Database size={18} />
                                )}
                                Create Branch Snapshot
                            </button>
                        </div>

                        {/* Restore Card */}
                        <div className="bg-red-50/50 rounded-xl border border-red-100 p-5">
                            <h3 className="font-semibold text-red-700 mb-2 flex items-center gap-2">
                                <AlertCircle size={18} /> Import & Restore
                            </h3>
                            <p className="text-sm text-red-600/80 mb-4">
                                Overwrite this branch's data with a <code className="text-red-700 bg-red-100 px-1 py-0.5 rounded">.q4branchbackup</code> file.
                            </p>
                            
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    value={restoreConfirmText}
                                    onChange={(e) => setRestoreConfirmText(e.target.value)}
                                    className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm focus:ring-red-500 focus:border-red-500 bg-white"
                                    placeholder="Type RESTORE BRANCH"
                                />
                                <input
                                    type="file"
                                    accept=".q4branchbackup"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isRestoring || restoreConfirmText !== "RESTORE BRANCH"}
                                    className="w-full flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isRestoring ? "Restoring..." : <><UploadCloud size={16} /> Select & Restore</>}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {selectedBranchId && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <History size={20} className="text-slate-600" />
                            Branch Snapshots History
                        </h2>
                        <button onClick={() => loadBackups(selectedBranchId)} className="text-indigo-600 text-sm hover:underline font-medium">
                            Refresh
                        </button>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white border-b border-slate-200">
                                    <th className="p-4 font-medium text-slate-500 text-sm">Date</th>
                                    <th className="p-4 font-medium text-slate-500 text-sm">File Name</th>
                                    <th className="p-4 font-medium text-slate-500 text-sm">Size</th>
                                    <th className="p-4 font-medium text-slate-500 text-sm">Status</th>
                                    <th className="p-4 font-medium text-slate-500 text-sm text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-slate-500">Loading branch backups...</td>
                                    </tr>
                                ) : backups.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center">
                                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-200">
                                                <Database className="w-5 h-5 text-slate-400" />
                                            </div>
                                            <p className="text-slate-500 font-medium">No snapshots found for this branch.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    backups.map((b) => (
                                        <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-4 text-slate-900 text-sm whitespace-nowrap">
                                                {new Date(b.created_at).toLocaleString()}
                                            </td>
                                            <td className="p-4 font-mono text-sm text-slate-600">
                                                <div className="flex items-center gap-2">
                                                    {b.filename.startsWith("SAFETY_") && (
                                                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] uppercase font-bold rounded-full border border-amber-200">
                                                            Safety
                                                        </span>
                                                    )}
                                                    {b.filename}
                                                </div>
                                            </td>
                                            <td className="p-4 text-sm text-slate-600 whitespace-nowrap">
                                                {formatBytes(b.size_bytes)}
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                {b.status === 'success' && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Success</span>}
                                                {b.status === 'pending' && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Pending</span>}
                                                {b.status === 'failed' && <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Failed</span>}
                                            </td>
                                            <td className="p-4 text-right whitespace-nowrap">
                                                {b.status === 'success' && (
                                                    <a
                                                        href={`/api/v1/organization-admin/branches/${selectedBranchId}/backups/${b.id}/download`}
                                                        download={b.filename}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 text-xs font-medium rounded-lg transition-colors shadow-sm"
                                                        title="Download Snapshot"
                                                    >
                                                        <Download size={14} /> Download
                                                    </a>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
