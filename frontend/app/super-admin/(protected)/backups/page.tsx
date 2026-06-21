"use client";

import React, { useState, useEffect } from "react";
import { DatabaseBackup, HardDrive, RefreshCcw, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { api, ApiError } from "@/lib/api";

interface BackupItem {
    filename: string;
    size_mb: number;
    created_at: string;
}

export default function BackupsPage() {
    const [backups, setBackups] = useState<BackupItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRestoring, setIsRestoring] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Modal state
    const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
    const [confirmText, setConfirmText] = useState("");

    const fetchBackups = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await api.getBackups();
            setBackups(data.items || []);
        } catch (err: unknown) {
            if (err instanceof ApiError) {
                setError(err.detail);
            } else {
                setError("Failed to fetch backups. Ensure the server is online.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBackups();
    }, []);

    const handleRestore = async () => {
        if (!selectedBackup || confirmText !== "RESTORE") return;
        
        setIsRestoring(true);
        setError(null);
        setSuccessMsg(null);
        
        try {
            await api.restoreBackup(selectedBackup);
            setSuccessMsg(`Database successfully restored from ${selectedBackup}`);
            setSelectedBackup(null);
            setConfirmText("");
        } catch (err: unknown) {
            if (err instanceof ApiError) {
                setError(`Restore failed: ${err.detail}`);
            } else {
                setError("A critical error occurred during the restore process.");
            }
        } finally {
            setIsRestoring(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                        <DatabaseBackup className="w-7 h-7 text-indigo-500" />
                        Disaster Recovery
                    </h1>
                    <p className="text-slate-400 mt-1">Manage bare-metal automated database backups and restoration.</p>
                </div>
                <button
                    onClick={fetchBackups}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 text-sm font-medium shadow-sm"
                >
                    <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh List
                </button>
            </div>

            {/* Alerts */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}
            {successMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">{successMsg}</p>
                </div>
            )}

            {/* Table Card */}
            <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 overflow-hidden">
                <div className="p-5 border-b border-slate-800 bg-slate-800/20 flex items-center gap-2">
                    <HardDrive className="w-5 h-5 text-slate-400" />
                    <h2 className="font-semibold text-slate-200">Local Disk Archives</h2>
                    <span className="ml-auto text-xs font-semibold px-2.5 py-1 bg-slate-800 text-slate-400 rounded-full border border-slate-700">
                        7-Day Retention
                    </span>
                </div>
                
                {isLoading ? (
                    <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                        <RefreshCcw className="w-8 h-8 animate-spin mb-3 text-slate-500" />
                        <p className="text-sm">Scanning local volume for backup files...</p>
                    </div>
                ) : backups.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-700">
                            <DatabaseBackup className="w-8 h-8 text-slate-500" />
                        </div>
                        <h3 className="text-slate-300 font-semibold mb-1">No backups found</h3>
                        <p className="text-slate-500 text-sm">Automated backups run daily. The first backup will appear here soon.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-800/50 text-slate-400 font-medium border-b border-slate-800 uppercase tracking-wider text-xs">
                                <tr>
                                    <th className="px-6 py-4">Created Date</th>
                                    <th className="px-6 py-4">Archive Filename</th>
                                    <th className="px-6 py-4 text-right">Size</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                                {backups.map((backup) => (
                                    <tr key={backup.filename} className="hover:bg-slate-800/40 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-300 flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-slate-500" />
                                            {new Date(backup.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-200 font-medium">
                                            {backup.filename}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right tabular-nums text-slate-400">
                                            <span className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-md text-xs font-semibold">
                                                {backup.size_mb} MB
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <button
                                                onClick={() => setSelectedBackup(backup.filename)}
                                                className="text-indigo-400 font-medium hover:text-indigo-300 hover:bg-indigo-500/10 px-3 py-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                            >
                                                Restore System
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Restore Confirmation Modal */}
            {selectedBackup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => !isRestoring && setSelectedBackup(null)} />
                    <div className="relative bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-8 animate-in fade-in zoom-in-95 duration-200">
                        
                        <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-5 border-4 border-red-500/10">
                            <AlertTriangle className="w-7 h-7" />
                        </div>
                        
                        <h3 className="text-xl font-bold text-white mb-2">Critical Action: Bare-Metal Restore</h3>
                        <p className="text-slate-400 mb-4 text-sm leading-relaxed">
                            You are about to restore the database from <span className="font-mono font-bold text-slate-200">{selectedBackup}</span>.
                        </p>
                        
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                            <p className="text-red-400 text-sm font-medium">
                                WARNING: This action will completely overwrite the live production database. All active connections will be forcefully terminated, and any queues or tokens created after this backup was made will be permanently lost.
                            </p>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-slate-300 mb-2">
                                Type <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-red-400">RESTORE</span> to confirm:
                            </label>
                            <input
                                type="text"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                disabled={isRestoring}
                                placeholder="RESTORE"
                                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all outline-none placeholder:text-slate-700"
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => { setSelectedBackup(null); setConfirmText(""); }}
                                disabled={isRestoring}
                                className="flex-1 py-3 bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 rounded-xl font-semibold transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRestore}
                                disabled={isRestoring || confirmText !== "RESTORE"}
                                className="flex-1 py-3 bg-red-600 text-white hover:bg-red-700 rounded-xl font-semibold shadow-md shadow-red-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isRestoring ? (
                                    <>
                                        <RefreshCcw className="w-5 h-5 animate-spin" />
                                        Restoring Data...
                                    </>
                                ) : (
                                    "Execute Restore"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
