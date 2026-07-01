'use client';

import React, { useEffect, useState } from 'react';
import { DownloadCloud, Plus, FileText, CheckCircle2, Clock, AlertCircle, Loader2, Database } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getExports, downloadExport, api } from '@/lib/api';
import RequestExportModal from '@/components/organization-admin/exports/RequestExportModal';
import { getToken } from '@/lib/auth';
import { config } from '@/lib/config';

export default function ExportsPage() {
    const token = getToken();
    const [jobs, setJobs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [backups, setBackups] = useState<any[]>([]);

    const fetchJobs = async () => {
        try {
            if (!token) return;
            const data = await getExports(token);
            setJobs(data);
            
            const backupData = await api.getOrgAdminBackups();
            setBackups(backupData);
        } catch (err) {
            console.error('Failed to fetch exports/backups', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
        // Poll every 10 seconds to update statuses
        const interval = setInterval(fetchJobs, 10000);
        return () => clearInterval(interval);
    }, [token]);

    const handleDownload = async (job: any) => {
        if (!token) return;
        setDownloadingId(job.id);
        
        try {
            if (job.format === 'pdf') {
                // Open the backend download endpoint in a new tab.
                // We pass the token in the query params which is now supported by the backend auth deps.
                const url = `${config.apiBaseUrl}/organization-admin/exports/${job.id}/download?token=${token}`;
                window.open(url, '_blank');
            } else {
                await downloadExport(job.id, job.file_path ? job.file_path.split('/').pop() : 'export', token!);
            }
        } catch (error) {
            alert('Failed to download file.');
        } finally {
            // Clear loading state after a brief delay
            setTimeout(() => setDownloadingId(null), 1000);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle2 size={16} className="text-emerald-500" />;
            case 'processing': return <Loader2 size={16} className="text-blue-500 animate-spin" />;
            case 'failed': return <AlertCircle size={16} className="text-red-500" />;
            default: return <Clock size={16} className="text-amber-500" />;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'processing': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'failed': return 'bg-red-50 text-red-700 border-red-200';
            default: return 'bg-amber-50 text-amber-700 border-amber-200';
        }
    };

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <DownloadCloud className="text-indigo-600" />
                        Download Center
                    </h1>
                    <p className="text-slate-500 mt-1">Request and download enterprise data reports.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200"
                >
                    <Plus size={18} />
                    New Export Request
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-indigo-50 rounded-xl shrink-0">
                            <Database className="text-indigo-600 w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                                Backup Center
                            </h2>
                            <p className="text-slate-500 text-sm mt-0.5">Tenant-isolated organization backups run daily at 03:00 AM.</p>
                        </div>
                    </div>
                    <a href="/organization-admin/backups" className="w-full md:w-auto inline-flex items-center justify-center bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm text-center">
                        Open Backup Center
                    </a>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-100">
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 col-span-2 sm:col-span-1">
                        <div className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold mb-1">Last Backup</div>
                        <div className="font-semibold text-slate-900 text-xs sm:text-sm">
                            {backups.length > 0 ? new Date(backups[0].created_at).toLocaleString() : "Never"}
                        </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 col-span-1">
                        <div className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold mb-1">Status</div>
                        <div className="font-semibold text-xs sm:text-sm">
                            {backups.length > 0 ? (
                                <span className="capitalize text-emerald-600 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    {backups[0].status}
                                </span>
                            ) : (
                                <span className="text-slate-900">N/A</span>
                            )}
                        </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 col-span-1">
                        <div className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold mb-1">Stored Backups</div>
                        <div className="font-semibold text-slate-900 text-xs sm:text-sm">{backups.length}</div>
                    </div>
                </div>
            </div>

            <h2 className="text-lg font-semibold text-slate-900 mb-4">Export History</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Mobile View Feed (spacious cards on small screens) */}
                <div className="block md:hidden divide-y divide-slate-100 bg-white">
                    {isLoading ? (
                        <div className="p-8 text-center text-slate-500 text-sm">
                            Loading exports...
                        </div>
                    ) : jobs.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 text-slate-400 mb-4">
                                <FileText size={32} />
                            </div>
                            <h3 className="text-base font-medium text-slate-900 mb-1">No export history</h3>
                            <p className="text-sm text-slate-500">Request your first data export to see it here.</p>
                        </div>
                    ) : (
                        jobs.map((job) => (
                            <div key={job.id} className="p-4 space-y-4 hover:bg-slate-50/30 transition-colors">
                                {/* Row 1: Report Details & Format */}
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                            <FileText size={15} className="text-slate-400 shrink-0" />
                                            {job.report_type}
                                        </h4>
                                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">#{job.id.split('-')[0]}...</p>
                                    </div>
                                    <span className="inline-flex px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold uppercase rounded-lg border border-slate-200 shrink-0">
                                        {job.format}
                                    </span>
                                </div>

                                {/* Row 2: Parameters Grid */}
                                <div className="grid grid-cols-2 gap-3 bg-slate-50/50 rounded-xl p-3 border border-slate-100 text-xs">
                                    <div className="flex justify-between items-center py-0.5">
                                        <span className="text-slate-500 font-medium">Filters</span>
                                        <span className="font-semibold text-slate-700 text-right">{job.filters?.date_range || 'All Time'}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-0.5">
                                        <span className="text-slate-500 font-medium">Status</span>
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold border rounded-full ${getStatusBadge(job.status)}`}>
                                            {getStatusIcon(job.status)}
                                            <span className="capitalize">{job.status}</span>
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-0.5 border-t border-slate-100/60 pt-1.5 col-span-2">
                                        <span className="text-slate-500 font-medium">Requested At</span>
                                        <span className="font-semibold text-slate-800 text-right">{new Date(job.created_at).toLocaleString()}</span>
                                    </div>
                                    {job.status === 'failed' && job.error_message && (
                                        <div className="col-span-2 text-[10px] text-red-500 border-t border-red-100 pt-1.5 max-w-full break-words">
                                            Error: {job.error_message}
                                        </div>
                                    )}
                                </div>

                                {/* Row 3: Action Button */}
                                <div className="pt-1">
                                    <button
                                        onClick={() => handleDownload(job)}
                                        disabled={job.status !== 'completed' || downloadingId === job.id}
                                        className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors ${
                                            job.status === 'completed'
                                                ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200'
                                                : 'text-slate-400 bg-slate-50 border border-slate-200 cursor-not-allowed'
                                        }`}
                                    >
                                        {downloadingId === job.id ? (
                                            <Loader2 size={15} className="animate-spin" />
                                        ) : (
                                            <DownloadCloud size={15} />
                                        )}
                                        Download
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Desktop View Table (visible on large viewports) */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                                <th className="p-4">Report Details</th>
                                <th className="p-4">Filters</th>
                                <th className="p-4">Format</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Requested At</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500">
                                        Loading exports...
                                    </td>
                                </tr>
                            ) : jobs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center">
                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-50 text-slate-400 mb-4">
                                            <FileText size={32} />
                                        </div>
                                        <h3 className="text-base font-medium text-slate-900 mb-1">No export history</h3>
                                        <p className="text-sm text-slate-500">Request your first data export to see it here.</p>
                                    </td>
                                </tr>
                            ) : (
                                jobs.map((job) => (
                                    <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-medium text-slate-900 flex items-center gap-2">
                                                <FileText size={16} className="text-slate-400" />
                                                {job.report_type}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1 font-mono">{job.id.split('-')[0]}...</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm text-slate-600">
                                                {job.filters?.date_range || 'All Time'}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="inline-flex px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg">
                                                {job.format}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border rounded-full ${getStatusBadge(job.status)}`}>
                                                {getStatusIcon(job.status)}
                                                <span className="capitalize">{job.status}</span>
                                            </span>
                                            {job.status === 'failed' && job.error_message && (
                                                <div className="text-[10px] text-red-500 mt-1 max-w-xs truncate" title={job.error_message}>
                                                    {job.error_message}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-sm text-slate-500">
                                            {new Date(job.created_at).toLocaleString()}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => handleDownload(job)}
                                                disabled={job.status !== 'completed' || downloadingId === job.id}
                                                className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                                                    job.status === 'completed'
                                                        ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                                                        : 'text-slate-400 bg-slate-50 cursor-not-allowed'
                                                }`}
                                            >
                                                {downloadingId === job.id ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : (
                                                    <DownloadCloud size={16} />
                                                )}
                                                Download
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <RequestExportModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onExportRequested={fetchJobs}
            />
        </div>
    );
}
